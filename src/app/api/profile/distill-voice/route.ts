import { errorResponse, jsonResponse, requireAuth } from "@/lib/api";
import { getUserProfile, upsertUserProfile } from "@/lib/db/queries";
import { distillVoiceForUser } from "@/lib/voice-dna";

export async function POST() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const profile = await getUserProfile(auth.user.id);
  if (!profile) {
    return errorResponse("profile_not_found", 404);
  }

  try {
    const dna = await distillVoiceForUser(auth.user.id, profile);
    if (!dna) {
      return errorResponse("no_corpus", 400, {
        message: "Add voice_samples or save a few drafts first.",
      });
    }
    const updated = await upsertUserProfile(auth.user.id, { voice_dna: dna });
    return jsonResponse({ voice_dna: updated.voice_dna });
  } catch (error) {
    return errorResponse("distill_failed", 500, {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
