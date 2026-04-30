import { z } from "zod";
import { jsonResponse, notFound, parseBody, requireAuth } from "@/lib/api";
import { deleteSource, getSource, updateSource } from "@/lib/db/queries";

const PatchBody = z.object({
  topic_tags: z.array(z.string().trim().min(1).max(64)).max(20).optional(),
  poll_interval_hours: z.number().int().min(1).max(168).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const source = await getSource(auth.user.id, id);
  if (!source) return notFound();
  return jsonResponse(source);
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
  const source = await updateSource(auth.user.id, id, parsed.data);
  return jsonResponse(source);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  await deleteSource(auth.user.id, id);
  return jsonResponse({ ok: true });
}
