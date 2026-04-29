import type { NextResponse } from "next/server";
import { getDecryptedProviderKey } from "@/lib/db/queries";
import type { ProviderId } from "@/lib/providers";
import { errorResponse } from "./responses";

type KeyResult =
  | { ok: true; apiKey: string }
  | { ok: false; response: NextResponse };

export async function requireProviderKey(
  userId: string,
  provider: ProviderId,
): Promise<KeyResult> {
  const apiKey = await getDecryptedProviderKey(userId, provider);
  if (!apiKey) {
    return {
      ok: false,
      response: errorResponse("missing_key", 402, { provider }),
    };
  }
  return { ok: true, apiKey };
}
