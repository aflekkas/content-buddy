import { z } from "zod";
import {
  errorResponse,
  jsonResponse,
  notFound,
  parseBody,
  requireAuth,
} from "@/lib/api";
import { deleteDraft, getDraft, updateDraft } from "@/lib/db/queries";

const PatchBody = z.object({
  body: z.string().trim().min(1).max(20000).optional(),
  status: z.enum(["draft", "copied", "posted", "dismissed"]).optional(),
});

type PostgrestError = {
  code?: string;
  message?: string;
};

function isMissingPostedAtColumn(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const { code, message } = error as PostgrestError;
  return (
    code === "PGRST204" &&
    typeof message === "string" &&
    message.includes("'posted_at' column")
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const draft = await getDraft(auth.user.id, id);
  if (!draft) return notFound();
  return jsonResponse(draft);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const parsed = await parseBody(req, PatchBody);
  if (!parsed.ok) return parsed.response;

  const { id } = await params;
  const patch = {
    ...parsed.data,
    copied_at:
      parsed.data.status === "copied" ? new Date().toISOString() : undefined,
    posted_at:
      parsed.data.status === "posted"
        ? new Date().toISOString()
        : parsed.data.status
          ? null
          : undefined,
  };
  try {
    const draft = await updateDraft(auth.user.id, id, patch);
    return jsonResponse(draft);
  } catch (error) {
    if (patch.posted_at !== undefined && isMissingPostedAtColumn(error)) {
      const fallbackPatch = { ...patch };
      delete fallbackPatch.posted_at;
      const draft = await updateDraft(auth.user.id, id, fallbackPatch);
      return jsonResponse(draft);
    }

    return errorResponse("update_failed", 500, {
      message: "Could not update draft.",
    });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  await deleteDraft(auth.user.id, id);
  return jsonResponse({ ok: true });
}
