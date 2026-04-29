import { jsonResponse, requireAuth } from "@/lib/api";
import { deleteUserFact } from "@/lib/db/queries";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  await deleteUserFact(auth.user.id, id);
  return jsonResponse({ ok: true });
}
