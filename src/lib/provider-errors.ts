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
  const sentinelIndex = msg.indexOf(SENTINEL);
  if (sentinelIndex === -1) return null;

  const encoded = msg.slice(sentinelIndex + SENTINEL.length).trim();
  try {
    const raw = JSON.parse(encoded);
    if (raw?.kind === "provider_error") return raw as ProviderErrorPayload;
  } catch {
    const match = encoded.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const raw = JSON.parse(match[0]);
        if (raw?.kind === "provider_error") return raw as ProviderErrorPayload;
      } catch {
        // malformed JSON -- fall through
      }
    }
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

  const details = readProviderErrorDetails(error);

  if (!details) {
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

  const { statusCode, body, message } = details;

  // --- HTTP 401 / auth errors ---
  if (statusCode === 401 || isAuthError(body, provider)) {
    return {
      kind: "provider_error",
      provider,
      code: "invalid_key",
      message: `Your ${providerLabel} API key was rejected.`,
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

  // --- model_not_found / org verification ---
  const errorCode = extractCode(body);
  const errorMessage = extractMessage(body) ?? message;

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
      message: `Your ${providerLabel} account doesn't have access to ${model}.`,
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
    openai: "OpenAI",
  };
  return labels[provider] ?? provider;
}

type ProviderBody = {
  error?: ProviderErrorObject | string;
  type?: string;
};

type ProviderErrorDetails = {
  statusCode: number;
  body: ProviderBody | null;
  message: string;
};

type ProviderErrorObject = {
  type?: string;
  code?: string | number;
  message?: string;
  status?: string;
};

function readProviderErrorDetails(error: unknown): ProviderErrorDetails | null {
  if (APICallError.isInstance(error)) {
    return {
      statusCode: error.statusCode ?? 0,
      body: parseProviderBody(error.responseBody),
      message: error.message,
    };
  }

  if (!isRecord(error)) return null;

  const body = isProviderBody(error)
    ? error
    : isProviderBody(error.error)
      ? error.error
      : null;

  if (!body) return null;

  return {
    statusCode: readStatusCode(body),
    body,
    message: extractMessage(body) ?? "unknown error",
  };
}

function parseProviderBody(responseBody: string | undefined): ProviderBody | null {
  if (!responseBody) return null;
  try {
    const parsed = JSON.parse(responseBody) as unknown;
    return isProviderBody(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isProviderBody(value: unknown): value is ProviderBody {
  if (!isRecord(value)) return false;
  if (!("error" in value)) return false;
  const error = value.error;
  return isRecord(error) || typeof error === "string";
}

function readStatusCode(body: ProviderBody): number {
  const code = isProviderErrorObject(body.error) ? body.error.code : undefined;
  if (typeof code === "number") return code;
  return 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAuthError(body: ProviderBody | null, provider: ProviderId): boolean {
  if (!body) return false;
  if (provider !== "openai") return false;
  const code = isProviderErrorObject(body.error) ? body.error.code : undefined;
  const type = isProviderErrorObject(body.error) ? body.error.type : undefined;
  return (
    code === "invalid_api_key" ||
    type === "invalid_request_error" && code === "invalid_api_key"
  );
}

function extractCode(body: ProviderBody | null): string | undefined {
  const code = isProviderErrorObject(body?.error) ? body.error.code : undefined;
  return code == null ? undefined : String(code);
}

function extractMessage(body: ProviderBody | null): string | undefined {
  if (typeof body?.error === "string") return body.error;
  return isProviderErrorObject(body?.error) ? body.error.message : undefined;
}

function isProviderErrorObject(value: unknown): value is ProviderErrorObject {
  return isRecord(value);
}
