import { z } from "zod";
import { jsonResponse, parseBody, requireAuth } from "@/lib/api";
import { createVideo } from "@/lib/db/queries";

const PostBody = z.object({
  title: z.string().min(3).max(120),
  hook: z.string().max(500).optional(),
  script: z.string().max(4000).optional(),
  chat_id: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const parsed = await parseBody(req, PostBody);
  if (!parsed.ok) return parsed.response;

  const video = await createVideo(auth.user.id, {
    chatId: parsed.data.chat_id,
    title: parsed.data.title.trim(),
    hook: parsed.data.hook?.trim(),
    script: parsed.data.script?.trim(),
  });

  return jsonResponse(video);
}
