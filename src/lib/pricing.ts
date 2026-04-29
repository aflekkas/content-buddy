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

const ANTHROPIC_CACHE_WRITE_MULTIPLIER = 1.25;
const ANTHROPIC_CACHE_READ_MULTIPLIER = 0.1;

function anthropicPrice(
  inputPerMillion: number,
  outputPerMillion: number,
): ModelPrice {
  return {
    inputPerMillion,
    outputPerMillion,
    cacheCreationPerMillion:
      inputPerMillion * ANTHROPIC_CACHE_WRITE_MULTIPLIER,
    cacheReadPerMillion: inputPerMillion * ANTHROPIC_CACHE_READ_MULTIPLIER,
  };
}

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
  anthropic: {
    "claude-opus-4-7": anthropicPrice(5, 25),
    "claude-sonnet-4-6": anthropicPrice(3, 15),
    "claude-haiku-4-5-20251001": anthropicPrice(1, 5),
  },
  openai: {
    "gpt-5.5": standardPrice(5, 30, 0.5),
    "gpt-5.4": standardPrice(2.5, 15, 0.25),
    "gpt-5.4-mini": standardPrice(0.75, 4.5, 0.075),
    "gpt-5.4-nano": standardPrice(0.2, 1.25, 0.02),
    "gpt-5": standardPrice(1.25, 10, 0.125),
    "gpt-5-mini": standardPrice(0.25, 2, 0.025),
    "gpt-5-nano": standardPrice(0.05, 0.4, 0.005),
  },
  google: {
    "gemini-3.1-pro-preview": standardPrice(2, 12, 0.2),
    "gemini-3-flash-preview": standardPrice(0.5, 3, 0.05),
    "gemini-3.1-flash-lite-preview": standardPrice(0.25, 1.5, 0.025),
    "gemini-2.5-pro": standardPrice(1.25, 10, 0.31),
    "gemini-2.5-flash": standardPrice(0.3, 2.5, 0.075),
    "gemini-2.5-flash-lite": standardPrice(0.1, 0.4, 0.025),
    "gemini-2.0-flash": standardPrice(0.1, 0.4, 0.025),
  },
  groq: {
    "llama-3.3-70b-versatile": standardPrice(0.59, 0.79),
    "llama-3.1-8b-instant": standardPrice(0.05, 0.08),
    "meta-llama/llama-4-scout-17b-16e-instruct": standardPrice(0.11, 0.34),
    "openai/gpt-oss-120b": standardPrice(0.15, 0.6),
    "openai/gpt-oss-20b": standardPrice(0.075, 0.3),
    "qwen/qwen3-32b": standardPrice(0.29, 0.59),
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
