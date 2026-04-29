import { z } from "zod";
import { jsonResponse, parseBody, requireAuth } from "@/lib/api";
import { createHook, listHooks } from "@/lib/db/queries";

const PostBody = z.object({
  text: z.string().min(1).max(500),
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string().min(1).max(40)).max(10).optional(),
});

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const hooks = await listHooks(auth.user.id);
  return jsonResponse({ hooks });
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const parsed = await parseBody(req, PostBody);
  if (!parsed.ok) return parsed.response;

  const hook = await createHook(auth.user.id, {
    text: parsed.data.text.trim(),
    notes: parsed.data.notes?.trim(),
    tags: parsed.data.tags?.map((t) => t.trim()).filter(Boolean),
    source: "manual",
  });
  return jsonResponse(hook, { status: 201 });
}
