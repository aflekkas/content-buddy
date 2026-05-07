import type { LanguageModelUsage } from "ai";
import { createAdminClient } from "@/lib/supabase/server";
import { estimateCostUsd, type TokenUsage } from "@/lib/pricing";
import type { ProviderId } from "@/lib/providers";

export const DAILY_AI_SPEND_LIMIT_USD = 1;
const MICRO_USD_PER_USD = 1_000_000;
const DEFAULT_AI_USAGE_PROVIDER: ProviderId = "openai";
const DEFAULT_AI_USAGE_MODEL = "gpt-4o-mini";

type UsageLike = Pick<
  LanguageModelUsage,
  "inputTokens" | "outputTokens" | "totalTokens" | "inputTokenDetails"
>;

export type DailyAiTokenBudget = {
  allowed: boolean;
  limitUsd: number;
  usedUsd: number;
  remainingUsd: number;
  resetAt: string;
};

type AiUsagePriceContext = {
  provider?: ProviderId;
  model?: string;
};

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function nextUtcMidnightIso() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  ).toISOString();
}

export function isMissingAiDailyUsageTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { code?: unknown; message?: unknown };
  if (maybeError.code === "PGRST205" || maybeError.code === "42P01") {
    return true;
  }

  const message =
    typeof maybeError.message === "string" ? maybeError.message : "";
  if (maybeError.code === "PGRST204" && message.includes("cost_micro_usd")) {
    return true;
  }

  return (
    message.includes("ai_daily_usage") &&
    (message.includes("schema cache") ||
      message.includes("does not exist") ||
      message.includes("not find the table"))
  );
}

function missingUsageTableBudget(limitUsd: number): DailyAiTokenBudget {
  return {
    allowed: true,
    limitUsd,
    usedUsd: 0,
    remainingUsd: limitUsd,
    resetAt: nextUtcMidnightIso(),
  };
}

function usdToMicroUsd(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.ceil(value * MICRO_USD_PER_USD);
}

function microUsdToUsd(value: unknown): number {
  return readNonNegativeNumber(value) / MICRO_USD_PER_USD;
}

function readNonNegativeNumber(value: unknown): number {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : 0;
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

function tokenUsageAndCost(
  usageOrTokens: UsageLike | number,
  context: AiUsagePriceContext = {},
): { tokens: number; costMicroUsd: number } {
  if (typeof usageOrTokens === "number") {
    return {
      tokens: Math.max(0, usageOrTokens),
      costMicroUsd: 0,
    };
  }

  const usage = tokenUsageFromLanguageModelUsage(usageOrTokens);
  const costUsd = estimateCostUsd(
    context.provider ?? DEFAULT_AI_USAGE_PROVIDER,
    context.model ?? DEFAULT_AI_USAGE_MODEL,
    usage,
  );
  return {
    tokens: totalTokensFromUsage(usageOrTokens),
    costMicroUsd: costUsd === null ? 0 : usdToMicroUsd(costUsd),
  };
}

export function tokenUsageFromLanguageModelUsage(
  usage: UsageLike,
): TokenUsage {
  const inputTokens = usage.inputTokens ?? 0;
  const outputTokens = usage.outputTokens ?? 0;
  const inputTokenDetails = usage.inputTokenDetails;
  return {
    inputTokens:
      inputTokenDetails?.noCacheTokens ?? Math.max(0, inputTokens),
    outputTokens,
    cacheReadTokens: inputTokenDetails?.cacheReadTokens ?? 0,
    cacheCreationTokens: inputTokenDetails?.cacheWriteTokens ?? 0,
  };
}

export function totalTokensFromUsage(usage: UsageLike): number {
  if (typeof usage.totalTokens === "number") return Math.max(0, usage.totalTokens);
  const normalized = tokenUsageFromLanguageModelUsage(usage);
  return (
    normalized.inputTokens +
    normalized.outputTokens +
    normalized.cacheReadTokens +
    normalized.cacheCreationTokens
  );
}

export async function checkDailyAiTokenBudget(
  userId: string,
  limitUsd = DAILY_AI_SPEND_LIMIT_USD,
): Promise<DailyAiTokenBudget> {
  const supabase = createAdminClient();
  const usageDate = todayUtc();
  const { data, error } = await supabase
    .from("ai_daily_usage")
    .select("cost_micro_usd")
    .eq("user_id", userId)
    .eq("usage_date", usageDate)
    .maybeSingle();

  if (error) {
    if (isMissingAiDailyUsageTableError(error)) {
      console.warn(
        "[ai-usage] ai_daily_usage table is missing; daily spend budget is not enforced until migrations are applied.",
      );
      return missingUsageTableBudget(limitUsd);
    }
    throw error;
  }

  const usedUsd = microUsdToUsd(data?.cost_micro_usd);
  const remainingUsd = Math.max(0, limitUsd - usedUsd);
  return {
    allowed: usedUsd < limitUsd,
    limitUsd,
    usedUsd,
    remainingUsd,
    resetAt: nextUtcMidnightIso(),
  };
}

export async function recordDailyAiTokenUsage(
  userId: string,
  usageOrTokens: UsageLike | number,
  context?: AiUsagePriceContext,
): Promise<void> {
  const { tokens, costMicroUsd } = tokenUsageAndCost(usageOrTokens, context);
  if (tokens === 0) return;

  const supabase = createAdminClient();
  const usageDate = todayUtc();
  const { data: existing, error: selectError } = await supabase
    .from("ai_daily_usage")
    .select("tokens,cost_micro_usd")
    .eq("user_id", userId)
    .eq("usage_date", usageDate)
    .maybeSingle();

  if (selectError) {
    if (isMissingAiDailyUsageTableError(selectError)) {
      console.warn(
        "[ai-usage] ai_daily_usage table is missing; daily token usage was not recorded.",
      );
      return;
    }
    throw selectError;
  }

  const nextTokens =
    readNonNegativeNumber(existing?.tokens) + tokens;
  const nextCostMicroUsd =
    readNonNegativeNumber(existing?.cost_micro_usd) + costMicroUsd;
  const { error } = await supabase.from("ai_daily_usage").upsert(
    {
      user_id: userId,
      usage_date: usageDate,
      tokens: nextTokens,
      cost_micro_usd: nextCostMicroUsd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,usage_date" },
  );

  if (error) {
    if (isMissingAiDailyUsageTableError(error)) {
      console.warn(
        "[ai-usage] ai_daily_usage table is missing; daily token usage was not recorded.",
      );
      return;
    }
    throw error;
  }
}

export function dailyBudgetHeaders(
  budget: DailyAiTokenBudget,
): Record<string, string> {
  return {
    "X-AI-Daily-Budget-Limit-Usd": String(budget.limitUsd),
    "X-AI-Daily-Budget-Used-Usd": String(budget.usedUsd),
    "X-AI-Daily-Budget-Remaining-Usd": String(budget.remainingUsd),
    "X-AI-Daily-Budget-Reset": budget.resetAt,
  };
}
