import { z } from "zod";
import {
  errorResponse,
  jsonResponse,
  parseBody,
  requireAuth,
} from "@/lib/api";
import { deleteFact, updateFact } from "@/lib/db/queries";

const PatchSchema = z.object({
  fact: z.string().trim().min(1).max(500),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await parseBody(req, PatchSchema);
  if (!body.ok) return body.response;

  try {
    const fact = await updateFact(auth.user.id, id, body.data.fact);
    return jsonResponse({ fact });
  } catch (error) {
    console.error("[memory] update failed", error);
    return errorResponse("update_failed", 500);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  await deleteFact(auth.user.id, id);
  return jsonResponse({ ok: true });
}
