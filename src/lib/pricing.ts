import type { ProviderId } from "@/lib/providers";

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
};

type ModelPrice = {
  inputPerMillion: number;
  outputPerMillion: number;
  cacheReadPerMillion?: number;
  cacheCreationPerMillion?: number;
};

function standardPrice(
  inputPerMillion: number,
  outputPerMillion: number,
  cacheReadPerMillion?: number,
): ModelPrice {
  return {
    inputPerMillion,
    outputPerMillion,
    cacheReadPerMillion,
    cacheCreationPerMillion: inputPerMillion,
  };
}

const PRICES: Partial<Record<ProviderId, Record<string, ModelPrice>>> = {
  openai: {
    "gpt-4o-mini": standardPrice(0.15, 0.6, 0.075),
    "gpt-5.5": standardPrice(5, 30, 0.5),
    "gpt-5.4": standardPrice(2.5, 15, 0.25),
    "gpt-5.4-mini": standardPrice(0.75, 4.5, 0.075),
    "gpt-5.4-nano": standardPrice(0.2, 1.25, 0.02),
    "gpt-5": standardPrice(1.25, 10, 0.125),
    "gpt-5-mini": standardPrice(0.25, 2, 0.025),
    "gpt-5-nano": standardPrice(0.05, 0.4, 0.005),
  },
};

export function estimateCostUsd(
  provider: ProviderId,
  model: string,
  usage: TokenUsage,
): number | null {
  const price = PRICES[provider]?.[model];
  if (!price) return null;

  const inputCost = usage.inputTokens * price.inputPerMillion;
  const outputCost = usage.outputTokens * price.outputPerMillion;
  const cacheReadCost =
    usage.cacheReadTokens *
    (price.cacheReadPerMillion ?? price.inputPerMillion);
  const cacheCreationCost =
    usage.cacheCreationTokens *
    (price.cacheCreationPerMillion ?? price.inputPerMillion);

  return (inputCost + outputCost + cacheReadCost + cacheCreationCost) / 1_000_000;
}
