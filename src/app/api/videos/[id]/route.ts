import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { deleteVideo, updateVideo } from "@/lib/db/queries";

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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = PatchBody.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { id } = await params;
  const video = await updateVideo(user.id, id, {
    title: parsed.data.title?.trim(),
    hook: parsed.data.hook?.trim(),
    script: parsed.data.script?.trim(),
    status: parsed.data.status,
  });

  if (!video) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(video);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await deleteVideo(user.id, id);
  return new Response(null, { status: 204 });
}
