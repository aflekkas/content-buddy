export const PROVIDERS = {
  anthropic: {
    label: "Anthropic",
    logo: "/providers/anthropic.svg",
    keyPrefix: "sk-ant-",
    consoleUrl: "https://console.anthropic.com/settings/keys",
    models: [
      { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
      { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
    ],
  },
  openai: {
    label: "OpenAI",
    logo: "/providers/openai.svg",
    keyPrefix: "sk-",
    consoleUrl: "https://platform.openai.com/api-keys",
    models: [
      { id: "gpt-5", label: "GPT-5" },
      { id: "gpt-5-mini", label: "GPT-5 Mini" },
    ],
  },
  google: {
    label: "Google Gemini",
    logo: "/providers/gemini.svg",
    keyPrefix: "AIza",
    consoleUrl: "https://aistudio.google.com/apikey",
    models: [
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    ],
  },
  xai: {
    label: "xAI Grok",
    logo: "/providers/grok.svg",
    keyPrefix: "xai-",
    consoleUrl: "https://console.x.ai/",
    models: [
      { id: "grok-4", label: "Grok 4" },
      { id: "grok-4-mini", label: "Grok 4 Mini" },
    ],
  },
  groq: {
    label: "Llama (via Groq)",
    logo: "/providers/llama.svg",
    keyPrefix: "gsk_",
    consoleUrl: "https://console.groq.com/keys",
    models: [
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
      { id: "llama-4-scout-17b-16e-instruct", label: "Llama 4 Scout" },
    ],
  },
} as const;

export type ProviderId = keyof typeof PROVIDERS;

export const PROVIDER_IDS = Object.keys(PROVIDERS) as ProviderId[];

export function isProviderId(value: unknown): value is ProviderId {
  return typeof value === "string" && value in PROVIDERS;
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
