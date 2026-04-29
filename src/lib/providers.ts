export const PROVIDERS = {
  anthropic: {
    label: "Anthropic",
    displayLabel: "Anthropic",
    sublabel: "Claude",
    logo: "/providers/anthropic.svg",
    keyPrefix: "sk-ant-",
    consoleUrl: "https://console.anthropic.com/settings/keys",
    models: [
      { id: "claude-opus-4-7", label: "Claude Opus 4.7" },
      { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
      { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
    ],
  },
  openai: {
    label: "OpenAI",
    displayLabel: "OpenAI",
    sublabel: "GPT",
    logo: "/providers/openai.svg",
    keyPrefix: "sk-",
    consoleUrl: "https://platform.openai.com/api-keys",
    models: [
      { id: "gpt-5.5", label: "GPT-5.5" },
      { id: "gpt-5.4", label: "GPT-5.4" },
      { id: "gpt-5.4-mini", label: "GPT-5.4 Mini" },
      { id: "gpt-5.4-nano", label: "GPT-5.4 Nano" },
      { id: "gpt-5", label: "GPT-5" },
      { id: "gpt-5-mini", label: "GPT-5 Mini" },
      { id: "gpt-5-nano", label: "GPT-5 Nano" },
    ],
  },
  google: {
    label: "Google Gemini",
    displayLabel: "Gemini",
    sublabel: "Google",
    logo: "/providers/gemini.svg",
    keyPrefix: "AIza",
    consoleUrl: "https://aistudio.google.com/apikey",
    models: [
      { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro Preview" },
      { id: "gemini-3-flash-preview", label: "Gemini 3 Flash Preview" },
      {
        id: "gemini-3.1-flash-lite-preview",
        label: "Gemini 3.1 Flash-Lite Preview",
      },
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite" },
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    ],
  },
  xai: {
    label: "xAI Grok",
    displayLabel: "Grok",
    sublabel: "xAI",
    logo: "/providers/grok.svg",
    keyPrefix: "xai-",
    consoleUrl: "https://console.x.ai/",
    models: [
      { id: "grok-4.20", label: "Grok 4.20" },
      { id: "grok-4.20-reasoning", label: "Grok 4.20 Reasoning" },
      { id: "grok-4-fast-reasoning", label: "Grok 4 Fast Reasoning" },
      { id: "grok-4-fast-non-reasoning", label: "Grok 4 Fast" },
      { id: "grok-code-fast-1", label: "Grok Code Fast" },
      { id: "grok-4", label: "Grok 4" },
      { id: "grok-3-mini", label: "Grok 3 Mini" },
      { id: "grok-3", label: "Grok 3" },
    ],
  },
  groq: {
    label: "Llama (via Groq)",
    displayLabel: "Llama",
    sublabel: "via Groq",
    logo: "/providers/llama.svg",
    keyPrefix: "gsk_",
    consoleUrl: "https://console.groq.com/keys",
    models: [
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
      { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B" },
      {
        id: "meta-llama/llama-4-scout-17b-16e-instruct",
        label: "Llama 4 Scout",
      },
      { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B" },
      { id: "openai/gpt-oss-20b", label: "GPT-OSS 20B" },
      { id: "qwen/qwen3-32b", label: "Qwen 3 32B" },
      { id: "groq/compound", label: "Groq Compound" },
      { id: "groq/compound-mini", label: "Groq Compound Mini" },
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

const VISION_PROVIDERS: ReadonlySet<ProviderId> = new Set([
  "anthropic",
  "openai",
  "google",
  "xai",
]);

export function providerSupportsImages(provider: ProviderId): boolean {
  return VISION_PROVIDERS.has(provider);
}
