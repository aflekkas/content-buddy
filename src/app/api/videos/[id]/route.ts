import { z } from "zod";
import {
  jsonResponse,
  notFound,
  parseBody,
  requireAuth,
} from "@/lib/api";
import { deleteVideo, getVideo, updateVideo } from "@/lib/db/queries";

const PatchBody = z
  .object({
    title: z.string().min(3).max(120).optional(),
    hook: z.string().max(500).optional(),
    script: z.string().max(4000).optional(),
    status: z.enum(["idea", "ready", "filmed"]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Patch must include at least one field",
  });

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const video = await getVideo(auth.user.id, id);
  if (!video) return notFound();

  return jsonResponse(video);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const parsed = await parseBody(req, PatchBody);
  if (!parsed.ok) return parsed.response;

  const { id } = await params;
  const video = await updateVideo(auth.user.id, id, {
    title: parsed.data.title?.trim(),
    hook: parsed.data.hook,
    script: parsed.data.script,
    status: parsed.data.status,
  });

  if (!video) return notFound();
  return jsonResponse(video);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  await deleteVideo(auth.user.id, id);
  return new Response(null, { status: 204 });
}
