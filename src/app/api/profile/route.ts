import { z } from "zod";
import { jsonResponse, parseBody, requireAuth } from "@/lib/api";
import { getUserProfile, upsertUserProfile } from "@/lib/db/queries";

const PatchBody = z.object({
  bio: z.string().max(2000),
});

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const profile = await getUserProfile(auth.user.id);

  return jsonResponse({
    bio: profile?.bio ?? "",
  });
}

export async function PATCH(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const parsed = await parseBody(req, PatchBody);
  if (!parsed.ok) return parsed.response;

  const profile = await upsertUserProfile(auth.user.id, parsed.data.bio);
  return jsonResponse({ bio: profile.bio });
}
