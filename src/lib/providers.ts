export const PROVIDERS = {
  openai: {
    label: "OpenAI",
    displayLabel: "OpenAI",
    sublabel: "GPT",
    logo: "/providers/openai.svg",
    keyPrefix: "sk-",
    consoleUrl: "https://platform.openai.com/api-keys",
    models: [
      { id: "gpt-5.4", label: "GPT-5.4", intelligence: 3, cost: 2 },
      { id: "gpt-5.4-mini", label: "GPT-5.4 Mini", intelligence: 2, cost: 1 },
      { id: "gpt-5", label: "GPT-5", intelligence: 2, cost: 2 },
      { id: "gpt-5-mini", label: "GPT-5 Mini", intelligence: 2, cost: 1 },
      { id: "gpt-5.5", label: "GPT-5.5", intelligence: 3, cost: 3 },
      { id: "gpt-5.4-nano", label: "GPT-5.4 Nano", intelligence: 1, cost: 1 },
      { id: "gpt-5-nano", label: "GPT-5 Nano", intelligence: 1, cost: 1 },
      { id: "gpt-4o-mini", label: "GPT-4o Mini", intelligence: 1, cost: 1 },
    ],
  },
} as const;

export type ProviderId = "openai";

export const PROVIDER_IDS: ProviderId[] = ["openai"];

export function isProviderId(value: unknown): value is ProviderId {
  return value === "openai";
}

export function isModelForProvider(
  provider: ProviderId,
  model: string,
): boolean {
  return PROVIDERS[provider].models.some((m) => m.id === model);
}

export function defaultModel(provider: ProviderId): string {
  return PROVIDERS[provider].models[0].id;
}

const VISION_PROVIDERS: ReadonlySet<ProviderId> = new Set(["openai"]);

export function providerSupportsImages(provider: ProviderId): boolean {
  return VISION_PROVIDERS.has(provider);
}
