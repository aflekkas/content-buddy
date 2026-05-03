import { z } from "zod";
import {
  errorResponse,
  jsonResponse,
  parseBody,
  requireAuth,
} from "@/lib/api";
import { createFact, listFacts } from "@/lib/db/queries";

const CreateSchema = z.object({
  fact: z.string().trim().min(1).max(500),
});

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const facts = await listFacts(auth.user.id);
  return jsonResponse({ facts });
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = await parseBody(req, CreateSchema);
  if (!body.ok) return body.response;

  try {
    const fact = await createFact(auth.user.id, body.data.fact, "user");
    return jsonResponse({ fact }, { status: 201 });
  } catch (error) {
    console.error("[memory] create failed", error);
    return errorResponse("create_failed", 500);
  }
}
