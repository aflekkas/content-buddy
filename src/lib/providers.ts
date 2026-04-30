export const PROVIDERS = {
  openai: {
    label: "OpenAI",
    displayLabel: "OpenAI",
    sublabel: "GPT",
    logo: "/providers/openai.svg",
    keyPrefix: "sk-",
    consoleUrl: "https://platform.openai.com/api-keys",
    models: [
      { id: "gpt-4o-mini", label: "GPT-4o Mini" },
      { id: "gpt-5.5", label: "GPT-5.5" },
      { id: "gpt-5.4", label: "GPT-5.4" },
      { id: "gpt-5.4-mini", label: "GPT-5.4 Mini" },
      { id: "gpt-5.4-nano", label: "GPT-5.4 Nano" },
      { id: "gpt-5", label: "GPT-5" },
      { id: "gpt-5-mini", label: "GPT-5 Mini" },
      { id: "gpt-5-nano", label: "GPT-5 Nano" },
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
