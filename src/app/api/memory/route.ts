import { z } from "zod";
import {
  errorResponse,
  jsonResponse,
  parseBody,
  requireAuth,
} from "@/lib/api";
import { createMemory, listMemories } from "@/lib/db/queries";

const CreateSchema = z.object({
  memory: z.string().trim().min(1).max(500),
});

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const memories = await listMemories(auth.user.id);
  return jsonResponse({ memories });
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = await parseBody(req, CreateSchema);
  if (!body.ok) return body.response;

  try {
    const memory = await createMemory(auth.user.id, body.data.memory, "user");
    return jsonResponse({ memory }, { status: 201 });
  } catch (error) {
    console.error("[memory] create failed", error);
    return errorResponse("create_failed", 500);
  }
}
