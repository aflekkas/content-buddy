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

export async function validateApifyToken(
  token: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const res = await fetch("https://api.apify.com/v2/users/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });

    if (res.status === 200) return { ok: true };
    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: "Apify rejected this token." };
    }

    return {
      ok: false,
      message: `Apify validation failed with status ${res.status}.`,
    };
  } catch {
    return {
      ok: false,
      message: "Could not reach Apify to validate this token.",
    };
  }
}
