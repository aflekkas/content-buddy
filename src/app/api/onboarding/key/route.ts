import { z } from "zod";
import {
  errorResponse,
  jsonResponse,
  parseBody,
  requireAuth,
  requireProviderKey,
} from "@/lib/api";
import {
  markOnboarded,
  setActiveModel,
  setProviderKey,
} from "@/lib/db/queries";
import { validateProviderKey } from "@/lib/provider-validate";
import {
  PROVIDERS,
  PROVIDER_IDS,
  defaultModel,
  type ProviderId,
} from "@/lib/providers";

export const maxDuration = 30;

const PayloadSchema = z.object({
  provider: z.enum(PROVIDER_IDS as [ProviderId, ...ProviderId[]]),
  api_key: z.string().min(20),
});

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const parsed = await parseBody(req, PayloadSchema, {
    errorCode: "invalid_payload",
    includeDetails: true,
  });
  if (!parsed.ok) return parsed.response;

  const { provider, api_key } = parsed.data;

  if (!api_key.startsWith(PROVIDERS[provider].keyPrefix)) {
    return errorResponse("invalid_key_format", 400, { provider });
  }

  const validation = await validateProviderKey(provider, api_key);
  if (!validation.ok && validation.reason === "auth") {
    return errorResponse("invalid_key", 402, {
      provider,
      message: `That key didn't work. Double-check it on the ${PROVIDERS[provider].label} console and try again.`,
    });
  }

  await setProviderKey(auth.user.id, provider, api_key);

  const stored = await requireProviderKey(auth.user.id, provider);
  if (!stored.ok) return stored.response;

  await setActiveModel(auth.user.id, provider, defaultModel(provider));
  await markOnboarded(auth.user.id);

  return jsonResponse({ ok: true });
}
