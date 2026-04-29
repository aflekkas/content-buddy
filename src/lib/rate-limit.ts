import { createClient } from "@/lib/supabase/server";

type RateLimitRule = {
  scope: string;
  limit: number;
  windowSeconds: number;
};

export type RateLimitDecision = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: string;
  retryAfter: number;
};

type RateLimitRpcRow = {
  allowed: boolean;
  limit_count: number;
  remaining_count: number;
  reset_at: string;
};

const CHAT_RATE_LIMIT_RULES: RateLimitRule[] = [
  { scope: "chat:minute", limit: 20, windowSeconds: 60 },
  { scope: "chat:hour", limit: 200, windowSeconds: 60 * 60 },
];

const SEARCH_RATE_LIMIT_RULES: RateLimitRule[] = [
  { scope: "search:minute", limit: 30, windowSeconds: 60 },
];

const ONBOARDING_SEED_RATE_LIMIT_RULES: RateLimitRule[] = [
  { scope: "onboarding_seed:hour", limit: 5, windowSeconds: 60 * 60 },
];

export async function checkRateLimit(
  rules: RateLimitRule[],
): Promise<RateLimitDecision> {
  const supabase = await createClient();
  let lastDecision: RateLimitDecision | null = null;

  for (const rule of rules) {
    const { data, error } = await supabase
      .rpc("check_rate_limit", {
        p_scope: rule.scope,
        p_limit_count: rule.limit,
        p_window_seconds: rule.windowSeconds,
      })
      .single();

    if (error) throw error;

    const decision = normalizeRateLimitRow(data as RateLimitRpcRow);
    lastDecision = decision;

    if (!decision.allowed) {
      return decision;
    }
  }

  return (
    lastDecision ?? {
      allowed: true,
      limit: rules[0].limit,
      remaining: rules[0].limit,
      resetAt: new Date(Date.now() + 60_000).toISOString(),
      retryAfter: 0,
    }
  );
}

export function checkChatRateLimit(): Promise<RateLimitDecision> {
  return checkRateLimit(CHAT_RATE_LIMIT_RULES);
}

export function checkSearchRateLimit(): Promise<RateLimitDecision> {
  return checkRateLimit(SEARCH_RATE_LIMIT_RULES);
}

export function checkOnboardingSeedRateLimit(): Promise<RateLimitDecision> {
  return checkRateLimit(ONBOARDING_SEED_RATE_LIMIT_RULES);
}

export function buildRateLimitHeaders(
  decision: RateLimitDecision,
): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(decision.limit),
    "X-RateLimit-Remaining": String(decision.remaining),
    "X-RateLimit-Reset": decision.resetAt,
  };

  if (!decision.allowed) {
    headers["Retry-After"] = String(decision.retryAfter);
  }

  return headers;
}

export function normalizeRateLimitRow(
  row: RateLimitRpcRow,
  now = new Date(),
): RateLimitDecision {
  const resetAt = new Date(row.reset_at);
  const retryAfter = Number.isNaN(resetAt.getTime())
    ? 60
    : Math.max(1, Math.ceil((resetAt.getTime() - now.getTime()) / 1000));

  return {
    allowed: row.allowed,
    limit: row.limit_count,
    remaining: row.remaining_count,
    resetAt: Number.isNaN(resetAt.getTime())
      ? new Date(now.getTime() + 60_000).toISOString()
      : resetAt.toISOString(),
    retryAfter,
  };
}
