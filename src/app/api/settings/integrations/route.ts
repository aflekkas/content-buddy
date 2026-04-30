import { z } from "zod";
import {
  errorResponse,
  jsonResponse,
  parseBody,
  requireAuth,
} from "@/lib/api";
import {
  clearExternalCredential,
  listExternalCredentialMeta,
  setExternalCredential,
} from "@/lib/db/queries";
import { validateApifyToken } from "@/lib/provider-validate";

const PutBody = z.object({
  kind: z.literal("apify"),
  token: z.string().trim().min(8).max(500),
});

const DeleteBody = z.object({
  kind: z.literal("apify"),
});

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  return jsonResponse(await listExternalCredentialMeta(auth.user.id));
}

export async function PUT(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const parsed = await parseBody(req, PutBody);
  if (!parsed.ok) return parsed.response;

  const validation = await validateApifyToken(parsed.data.token);
  if (!validation.ok) {
    return errorResponse("invalid_key", 400, { message: validation.message });
  }

  await setExternalCredential(
    auth.user.id,
    parsed.data.kind,
    parsed.data.token,
  );
  return jsonResponse({ ok: true });
}

export async function DELETE(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const parsed = await parseBody(req, DeleteBody);
  if (!parsed.ok) return parsed.response;

  await clearExternalCredential(auth.user.id, parsed.data.kind);
  return jsonResponse({ ok: true });
}
