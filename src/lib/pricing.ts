// USD per 1M tokens. Update here if Anthropic's pricing shifts.
// https://docs.anthropic.com/en/docs/about-claude/pricing
const PRICE_PER_MTOK = {
  "claude-sonnet-4-6": {
    input: 3,
    output: 15,
    cacheWrite5m: 3.75,
    cacheRead: 0.3,
  },
  "claude-haiku-4-5-20251001": {
    input: 1,
    output: 5,
    cacheWrite5m: 1.25,
    cacheRead: 0.1,
  },
} as const;

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
};

export function estimateCostUsd(
  usage: TokenUsage,
  modelId: keyof typeof PRICE_PER_MTOK = "claude-sonnet-4-6",
): number {
  const p = PRICE_PER_MTOK[modelId];
  const per = 1_000_000;
  return (
    (usage.inputTokens * p.input +
      usage.outputTokens * p.output +
      usage.cacheReadTokens * p.cacheRead +
      usage.cacheCreationTokens * p.cacheWrite5m) /
    per
  );
}

export function formatUsd(cost: number): string {
  if (cost <= 0) return "$0.00";
  if (cost < 0.01) return "<$0.01";
  if (cost < 1) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
}
