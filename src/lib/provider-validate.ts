import type { ProviderId } from "@/lib/providers";

export type ValidationResult =
  | { ok: true }
  | { ok: false; reason: "auth" | "network" };

export async function validateProviderKey(
  provider: ProviderId,
  key: string,
): Promise<ValidationResult> {
  if (provider !== "openai") return { ok: true };

  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    });

    if (res.status === 401 || res.status === 403) {
      return { ok: false, reason: "auth" };
    }

    return { ok: true };
  } catch {
    return { ok: false, reason: "network" };
  }
}
