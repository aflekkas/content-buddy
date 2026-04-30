import { z } from "zod";
import {
  jsonResponse,
  parseBody,
  requireAuth,
  requireProviderKey,
} from "@/lib/api";
import { getActiveModel, upsertUserProfile } from "@/lib/db/queries";

export const maxDuration = 15;

const ProfilePatchSchema = z
  .object({
    niche: z.string().trim().max(240).nullable().optional(),
    voice_notes: z.string().trim().max(1000).nullable().optional(),
  })
  .strict();

const PayloadSchema = z.object({
  profile: ProfilePatchSchema,
});

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { provider } = await getActiveModel(auth.user.id);
  const key = await requireProviderKey(auth.user.id, provider);
  if (!key.ok) return key.response;

  const parsed = await parseBody(req, PayloadSchema, {
    errorCode: "invalid_payload",
    includeDetails: true,
  });
  if (!parsed.ok) return parsed.response;

  await upsertUserProfile(auth.user.id, parsed.data.profile);

  return jsonResponse({ ok: true });
}
