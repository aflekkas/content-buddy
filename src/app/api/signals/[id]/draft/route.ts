import { errorResponse, jsonResponse, notFound, requireAuth } from "@/lib/api";
import {
  createDraft,
  getSignal,
  getUserProfile,
  updateSignal,
} from "@/lib/db/queries";
import { synthesizeFromSignals } from "@/lib/synthesis";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const signal = await getSignal(auth.user.id, id);
  if (!signal) return notFound();

  const profile = await getUserProfile(auth.user.id);
  try {
    const { body, post_type } = await synthesizeFromSignals({
      mode: "news",
      signals: [signal],
      profile,
    });
    const draft = await createDraft(auth.user.id, {
      body,
      signal_ids: [signal.id],
      post_type,
    });
    await updateSignal(auth.user.id, signal.id, { status: "drafted" });
    return jsonResponse(draft, { status: 201 });
  } catch (error) {
    return errorResponse("generation_failed", 500, {
      message:
        error instanceof Error ? error.message : "Could not synthesize draft.",
    });
  }
}
