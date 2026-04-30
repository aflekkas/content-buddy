import { z } from "zod";
import { errorResponse, jsonResponse, parseBody, requireAuth } from "@/lib/api";
import { createSource, listSources } from "@/lib/db/queries";

const SourceKind = z.enum(["x_self", "x_account"]);
const Handle = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .transform((value) => value.replace(/^@+/, "").toLowerCase())
  .refine((value) => /^[a-z0-9_]+$/.test(value), "invalid handle");

const PostBody = z.object({
  kind: SourceKind,
  handle: Handle,
  topic_tags: z.array(z.string().trim().min(1).max(64)).max(20).optional(),
  poll_interval_hours: z.number().int().min(1).max(168).optional(),
});

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  return jsonResponse(await listSources(auth.user.id));
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const parsed = await parseBody(req, PostBody, {
    errorCode: "invalid_body",
    includeDetails: true,
  });
  if (!parsed.ok) return parsed.response;

  try {
    const source = await createSource(auth.user.id, parsed.data);
    return jsonResponse(source, { status: 201 });
  } catch (error) {
    return errorResponse("create_failed", 400, {
      message: error instanceof Error ? error.message : "Could not create source.",
    });
  }
}
