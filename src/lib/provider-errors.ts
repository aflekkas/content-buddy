import { APICallError } from "@ai-sdk/provider";
import type { ProviderId } from "./providers";

/** Structured provider error sent through the SSE stream and rendered in chat. */
export type ProviderErrorPayload = {
  kind: "provider_error";
  provider: ProviderId;
  code:
    | "org_unverified"
    | "model_unavailable"
    | "invalid_key"
    | "rate_limited"
    | "provider_error";
  message: string;
  helpUrl?: string;
};

/** Sentinel prefix so the client can detect a structured error vs a plain SDK message. */
const SENTINEL = "__PROVIDER_ERROR__:";

export function encodeProviderError(payload: ProviderErrorPayload): string {
  return SENTINEL + JSON.stringify(payload);
}

export function decodeProviderError(
  msg: string,
): ProviderErrorPayload | null {
  if (!msg.startsWith(SENTINEL)) return null;
  try {
    const raw = JSON.parse(msg.slice(SENTINEL.length));
    if (raw?.kind === "provider_error") return raw as ProviderErrorPayload;
  } catch {
    // malformed JSON -- fall through
  }
  return null;
}

/**
 * Maps a streamText error into a typed ProviderErrorPayload.
 *
 * The AI SDK wraps provider HTTP errors as `APICallError` with:
 *   - `statusCode` — HTTP status from the provider
 *   - `responseBody` — raw JSON string of the provider error body
 *
 * We JSON.parse responseBody to extract provider-specific code/message fields.
 */
export function mapProviderError(
  provider: ProviderId,
  model: string,
  error: unknown,
): ProviderErrorPayload {
  const providerLabel = providerName(provider);

  if (!APICallError.isInstance(error)) {
    // Not an HTTP error from the provider — could be a network error, abort, etc.
    const msg =
      error instanceof Error ? error.message : "unknown error";
    return {
      kind: "provider_error",
      provider,
      code: "provider_error",
      message: `Something went wrong talking to ${providerLabel}. ${msg}`,
    };
  }

  const statusCode = error.statusCode ?? 0;
  let body: ProviderBody | null = null;
  if (error.responseBody) {
    try {
      body = JSON.parse(error.responseBody) as ProviderBody;
    } catch {
      // leave body as null
    }
  }

  // --- HTTP 401 / auth errors ---
  if (statusCode === 401 || isAuthError(body, provider)) {
    return {
      kind: "provider_error",
      provider,
      code: "invalid_key",
      message: `Your ${providerLabel} API key was rejected. Update it in settings.`,
      helpUrl: "/settings",
    };
  }

  // --- HTTP 429 rate limit ---
  if (statusCode === 429) {
    return {
      kind: "provider_error",
      provider,
      code: "rate_limited",
      message: `Rate limited by ${providerLabel}. Try again in a moment.`,
    };
  }

  // --- model_not_found / org verification (OpenAI, Groq, xAI, etc.) ---
  const errorCode = extractCode(body);
  const errorMessage = extractMessage(body) ?? error.message;

  if (
    errorCode === "model_not_found" ||
    statusCode === 404
  ) {
    // OpenAI org-verification gate: message includes "verified"
    if (errorMessage?.toLowerCase().includes("verif")) {
      return {
        kind: "provider_error",
        provider,
        code: "org_unverified",
        message: `Your ${providerLabel} account must be verified to use ${model}. Click to verify.`,
        helpUrl: "https://platform.openai.com/settings/organization/general",
      };
    }
    return {
      kind: "provider_error",
      provider,
      code: "model_unavailable",
      message: `Your ${providerLabel} account doesn't have access to ${model}. Pick another model in settings.`,
      helpUrl: "/settings",
    };
  }

  // --- Fallback ---
  return {
    kind: "provider_error",
    provider,
    code: "provider_error",
    message: `${providerLabel} returned an error${errorMessage ? `: ${errorMessage}` : "."}`,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function providerName(provider: ProviderId): string {
  const labels: Record<ProviderId, string> = {
    anthropic: "Anthropic",
    openai: "OpenAI",
    google: "Google Gemini",
    xai: "xAI",
    groq: "Groq",
  };
  return labels[provider] ?? provider;
}

// Loosely-typed body shapes across providers
type ProviderBody = {
  // OpenAI / Groq / xAI: { error: { type, code, message } }
  error?: { type?: string; code?: string; message?: string };
  // Anthropic: { type: "error", error: { type, message } }
  type?: string;
  // Google: { error: { code, message, status } }
};

function isAuthError(body: ProviderBody | null, provider: ProviderId): boolean {
  if (!body) return false;
  if (provider === "anthropic") {
    return (body.error as { type?: string } | undefined)?.type === "authentication_error";
  }
  // OpenAI / Groq / xAI
  const code = body.error?.code;
  const type = body.error?.type;
  return (
    code === "invalid_api_key" ||
    type === "invalid_request_error" && code === "invalid_api_key"
  );
}

function extractCode(body: ProviderBody | null): string | undefined {
  return body?.error?.code ?? undefined;
}

function extractMessage(body: ProviderBody | null): string | undefined {
  return body?.error?.message ?? undefined;
}
