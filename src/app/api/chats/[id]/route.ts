import { errorResponse, jsonResponse, requireAuth } from "@/lib/api";
import { deleteChat, renameChat } from "@/lib/db/queries";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as { title?: unknown } | null;
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) {
    return errorResponse("title required", 400);
  }

  const { id } = await params;
  await renameChat(id, auth.user.id, title.slice(0, 200));
  return jsonResponse({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  await deleteChat(id, auth.user.id);
  return jsonResponse({ ok: true });
}
