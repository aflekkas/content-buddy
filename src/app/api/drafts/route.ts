import { z } from "zod";
import { jsonResponse, parseBody, requireAuth } from "@/lib/api";
import { createDraft, listDrafts } from "@/lib/db/queries";

const PostBody = z.object({
  signal_ids: z.array(z.uuid()).max(50).optional(),
  body: z.string().trim().min(1).max(20000),
});

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  return jsonResponse(await listDrafts(auth.user.id));
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const parsed = await parseBody(req, PostBody);
  if (!parsed.ok) return parsed.response;

  const draft = await createDraft(auth.user.id, parsed.data);
  return jsonResponse(draft, { status: 201 });
}
