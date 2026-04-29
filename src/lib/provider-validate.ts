import type { ProviderId } from "@/lib/providers";

export type ValidationResult =
  | { ok: true }
  | { ok: false; reason: "auth" | "network" };

/**
 * Pings each provider's cheapest endpoint (models list) to verify the key
 * works. Returns { ok: true } on success, { ok: false, reason: "auth" } on
 * 401/403, and { ok: false, reason: "network" } on timeouts/network errors.
 *
 * Network failures are non-blocking in the route — only auth failures should
 * block saving.
 */
export async function validateProviderKey(
  provider: ProviderId,
  key: string,
): Promise<ValidationResult> {
  const signal = AbortSignal.timeout(8000);

  try {
    let res: Response;

    switch (provider) {
      case "anthropic":
        res = await fetch("https://api.anthropic.com/v1/models", {
          method: "GET",
          headers: {
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
          },
          signal,
        });
        break;

      case "openai":
        res = await fetch("https://api.openai.com/v1/models", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${key}`,
          },
          signal,
        });
        break;

      case "google":
        res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
          { method: "GET", signal },
        );
        break;

      case "xai":
        res = await fetch("https://api.x.ai/v1/models", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${key}`,
          },
          signal,
        });
        break;

      case "groq":
        res = await fetch("https://api.groq.com/openai/v1/models", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${key}`,
          },
          signal,
        });
        break;

      default:
        // Unknown provider — skip validation rather than blocking save.
        return { ok: true };
    }

    if (res.status === 401 || res.status === 403) {
      return { ok: false, reason: "auth" };
    }

    return { ok: true };
  } catch {
    // Covers AbortError (timeout), DNS failure, network unreachable, etc.
    return { ok: false, reason: "network" };
  }
}
