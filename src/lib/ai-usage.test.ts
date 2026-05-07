import { describe, expect, it } from "vitest";
import {
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
});
