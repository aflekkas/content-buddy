import { z } from "zod";
import {
  jsonResponse,
  notFound,
  parseBody,
  requireAuth,
} from "@/lib/api";
import { deleteHook, updateHook } from "@/lib/db/queries";

const PatchBody = z
  .object({
    text: z.string().min(1).max(500).optional(),
    notes: z.string().max(1000).optional(),
    tags: z.array(z.string().min(1).max(40)).max(10).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Patch must include at least one field",
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
  const hook = await updateHook(auth.user.id, id, {
    text: parsed.data.text?.trim(),
    notes: parsed.data.notes?.trim(),
    tags: parsed.data.tags?.map((t) => t.trim()).filter(Boolean),
  });
  if (!hook) return notFound();
  return jsonResponse(hook);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  await deleteHook(auth.user.id, id);
  return new Response(null, { status: 204 });
}
