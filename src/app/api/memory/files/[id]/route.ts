import { z } from "zod";
import {
  errorResponse,
  jsonResponse,
  notFound,
  parseBody,
  requireAuth,
} from "@/lib/api";
import {
  deleteMemoryFile,
  getMemoryFileById,
  updateMemoryFile,
} from "@/lib/db/queries";
import {
  MAX_MEMORY_CONTENT_LENGTH,
  isProtectedMemoryPath,
} from "@/lib/memory";

const PatchBody = z.object({
  path: z.string().min(1).max(180).optional(),
  title: z.string().max(120).optional(),
  content: z.string().max(MAX_MEMORY_CONTENT_LENGTH).optional(),
  autoload: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const parsed = await parseBody(req, PatchBody);
  if (!parsed.ok) return parsed.response;

  const { id } = await params;
  try {
    const existing = await getMemoryFileById(auth.user.id, id);
    if (!existing) return notFound();
    if (isProtectedMemoryPath(existing.path)) {
      return errorResponse("protected_file", 403);
    }
    if (
      parsed.data.path !== undefined &&
      isProtectedMemoryPath(parsed.data.path)
    ) {
      return errorResponse("protected_file", 403);
    }

    const file = await updateMemoryFile(auth.user.id, id, {
      ...parsed.data,
      source: "user",
    });
    if (!file) return notFound();
    return jsonResponse(file);
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "update_failed",
      400,
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const existing = await getMemoryFileById(auth.user.id, id);
  if (!existing) return notFound();
  if (isProtectedMemoryPath(existing.path)) {
    return errorResponse("protected_file", 403);
  }
  await deleteMemoryFile(auth.user.id, id);
  return jsonResponse({ ok: true });
}
