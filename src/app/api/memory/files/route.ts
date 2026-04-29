import { z } from "zod";
import {
  errorResponse,
  jsonResponse,
  parseBody,
  requireAuth,
} from "@/lib/api";
import {
  createMemoryFile,
  ensureStarterMemoryFiles,
  summarizeMemoryFiles,
} from "@/lib/db/queries";
import { MAX_MEMORY_CONTENT_LENGTH } from "@/lib/memory";

const PostBody = z.object({
  path: z.string().min(1).max(180),
  title: z.string().max(120).optional(),
  content: z.string().max(MAX_MEMORY_CONTENT_LENGTH).optional(),
  autoload: z.boolean().optional(),
});

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const files = await ensureStarterMemoryFiles(auth.user.id);
  return jsonResponse({
    files,
    summaries: summarizeMemoryFiles(files),
  });
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const parsed = await parseBody(req, PostBody);
  if (!parsed.ok) return parsed.response;

  try {
    const file = await createMemoryFile(auth.user.id, {
      ...parsed.data,
      source: "user",
    });
    return jsonResponse(file);
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "create_failed",
      400,
    );
  }
}
