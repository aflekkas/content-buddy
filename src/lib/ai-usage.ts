import type { LanguageModelUsage } from "ai";
import { createAdminClient } from "@/lib/supabase/server";
import type { TokenUsage } from "@/lib/pricing";

export const DAILY_AI_TOKEN_LIMIT = 100_000;

type UsageLike = Pick<
  LanguageModelUsage,
  "inputTokens" | "outputTokens" | "totalTokens" | "inputTokenDetails"
>;

export type DailyAiTokenBudget = {
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number;
  resetAt: string;
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

export function tokenUsageFromLanguageModelUsage(
  usage: UsageLike,
): TokenUsage {
  const inputTokens = usage.inputTokens ?? 0;
  const outputTokens = usage.outputTokens ?? 0;
  return {
    inputTokens:
      usage.inputTokenDetails.noCacheTokens ?? Math.max(0, inputTokens),
    outputTokens,
    cacheReadTokens: usage.inputTokenDetails.cacheReadTokens ?? 0,
    cacheCreationTokens: usage.inputTokenDetails.cacheWriteTokens ?? 0,
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
  limit = DAILY_AI_TOKEN_LIMIT,
): Promise<DailyAiTokenBudget> {
  const supabase = createAdminClient();
  const usageDate = todayUtc();
  const { data, error } = await supabase
    .from("ai_daily_usage")
    .select("tokens")
    .eq("user_id", userId)
    .eq("usage_date", usageDate)
    .maybeSingle();

  if (error) throw error;

  const used = typeof data?.tokens === "number" ? data.tokens : 0;
  const remaining = Math.max(0, limit - used);
  return {
    allowed: used < limit,
    limit,
    used,
    remaining,
    resetAt: nextUtcMidnightIso(),
  };
}

export async function recordDailyAiTokenUsage(
  userId: string,
  usageOrTokens: UsageLike | number,
): Promise<void> {
  const tokens =
    typeof usageOrTokens === "number"
      ? Math.max(0, usageOrTokens)
      : totalTokensFromUsage(usageOrTokens);
  if (tokens === 0) return;

  const supabase = createAdminClient();
  const usageDate = todayUtc();
  const { data: existing, error: selectError } = await supabase
    .from("ai_daily_usage")
    .select("tokens")
    .eq("user_id", userId)
    .eq("usage_date", usageDate)
    .maybeSingle();

  if (selectError) throw selectError;

  const nextTokens =
    (typeof existing?.tokens === "number" ? existing.tokens : 0) + tokens;
  const { error } = await supabase.from("ai_daily_usage").upsert(
    {
      user_id: userId,
      usage_date: usageDate,
      tokens: nextTokens,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,usage_date" },
  );

  if (error) throw error;
}

export function dailyBudgetHeaders(
  budget: DailyAiTokenBudget,
): Record<string, string> {
  return {
    "X-AI-TokenLimit-Limit": String(budget.limit),
    "X-AI-TokenLimit-Used": String(budget.used),
    "X-AI-TokenLimit-Remaining": String(budget.remaining),
    "X-AI-TokenLimit-Reset": budget.resetAt,
  };
}
