import { z } from "zod";
import { jsonResponse, parseBody, requireAuth } from "@/lib/api";
import { addUserFact } from "@/lib/db/queries";

const PostBody = z.object({
  content: z.string().min(3).max(300),
});

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const parsed = await parseBody(req, PostBody);
  if (!parsed.ok) return parsed.response;

  const fact = await addUserFact(auth.user.id, parsed.data.content.trim());
  return jsonResponse(fact);
}
