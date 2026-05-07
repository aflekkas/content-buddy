import { describe, expect, it } from "vitest";
import {
  isMissingAiDailyUsageTableError,
  tokenUsageFromLanguageModelUsage,
  totalTokensFromUsage,
} from "./ai-usage";

describe("ai usage helpers", () => {
  it("normalizes language model usage into app token usage", () => {
    const usage = tokenUsageFromLanguageModelUsage({
      inputTokens: 100,
      outputTokens: 25,
      totalTokens: 125,
      inputTokenDetails: {
        noCacheTokens: 80,
        cacheReadTokens: 15,
        cacheWriteTokens: 5,
      },
    });

    expect(usage).toEqual({
      inputTokens: 80,
      outputTokens: 25,
      cacheReadTokens: 15,
      cacheCreationTokens: 5,
    });
  });

  it("falls back to summed token details when total tokens are absent", () => {
    expect(
      totalTokensFromUsage({
        inputTokens: 100,
        outputTokens: 25,
        totalTokens: undefined,
        inputTokenDetails: {
          noCacheTokens: undefined,
          cacheReadTokens: 10,
          cacheWriteTokens: 5,
        },
      }),
    ).toBe(140);
  });

  it("handles usage without input token details", () => {
    expect(
      tokenUsageFromLanguageModelUsage({
        inputTokens: 12,
        outputTokens: 8,
        totalTokens: 20,
        inputTokenDetails: undefined,
      }),
    ).toEqual({
      inputTokens: 12,
      outputTokens: 8,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
    });
  });

  it("recognizes missing ai daily usage table errors", () => {
    expect(
      isMissingAiDailyUsageTableError({
        code: "PGRST205",
        message:
          "Could not find the table 'public.ai_daily_usage' in the schema cache",
      }),
    ).toBe(true);
    expect(
      isMissingAiDailyUsageTableError({
        code: "42P01",
        message: 'relation "public.ai_daily_usage" does not exist',
      }),
    ).toBe(true);
    expect(
      isMissingAiDailyUsageTableError({
        code: "PGRST204",
        message:
          "Could not find the 'cost_micro_usd' column of 'ai_daily_usage' in the schema cache",
      }),
    ).toBe(true);
    expect(
      isMissingAiDailyUsageTableError({
        code: "PGRST116",
        message: "JSON object requested, multiple rows returned",
      }),
    ).toBe(false);
  });
});
