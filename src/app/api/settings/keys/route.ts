import { z } from "zod";
import {
  errorResponse,
  jsonResponse,
  parseBody,
  requireAuth,
} from "@/lib/api";
import { isProviderId, PROVIDER_IDS, PROVIDERS } from "@/lib/providers";
import {
  clearProviderKey,
  listProviderKeyMeta,
  setProviderKey,
} from "@/lib/db/queries";
import { validateProviderKey } from "@/lib/provider-validate";

const PutBody = z.object({
  provider: z.enum(PROVIDER_IDS as [string, ...string[]]),
  key: z.string().min(8).max(500),
});

const DeleteBody = z.object({
  provider: z.enum(PROVIDER_IDS as [string, ...string[]]),
});

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  return jsonResponse(await listProviderKeyMeta(auth.user.id));
}

export async function PUT(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const parsed = await parseBody(req, PutBody);
  if (!parsed.ok) return parsed.response;
  const { provider, key } = parsed.data;
  if (!isProviderId(provider)) {
    return errorResponse("unknown_provider", 400);
  }

  const expectedPrefix = PROVIDERS[provider].keyPrefix;
  if (!key.trim().startsWith(expectedPrefix)) {
    return errorResponse("wrong_prefix", 400, { expected: expectedPrefix });
  }

  const validation = await validateProviderKey(provider, key);
  if (!validation.ok && validation.reason === "auth") {
    return errorResponse("invalid_key", 400, {
      message: "Provider rejected this key. Check it and try again.",
    });
  }

  const meta = await setProviderKey(auth.user.id, provider, key);
  return jsonResponse(meta);
}

export async function DELETE(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const parsed = await parseBody(req, DeleteBody);
  if (!parsed.ok) return parsed.response;
  const { provider } = parsed.data;
  if (!isProviderId(provider)) {
    return errorResponse("unknown_provider", 400);
  }

  await clearProviderKey(auth.user.id, provider);
  return jsonResponse({ ok: true });
}
