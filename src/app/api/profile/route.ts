import { z } from "zod";
import { jsonResponse, parseBody, requireAuth } from "@/lib/api";
import { getUserProfile, upsertUserProfile } from "@/lib/db/queries";

const PatchBody = z.object({
  niche: z.string().trim().max(240).nullable().optional(),
  voice_notes: z.string().trim().max(1000).nullable().optional(),
});

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const profile = await getUserProfile(auth.user.id);

  return jsonResponse({
    niche: profile?.niche ?? null,
    voice_notes: profile?.voice_notes ?? null,
  });
}

export async function PATCH(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const parsed = await parseBody(req, PatchBody);
  if (!parsed.ok) return parsed.response;

  const profile = await upsertUserProfile(auth.user.id, parsed.data);
  return jsonResponse({
    niche: profile.niche,
    voice_notes: profile.voice_notes,
  });
}
