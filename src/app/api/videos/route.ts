import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createVideo } from "@/lib/db/queries";

const PostBody = z.object({
  title: z.string().min(3).max(120),
  hook: z.string().max(500).optional(),
  script: z.string().max(4000).optional(),
  chat_id: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = PostBody.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const video = await createVideo(user.id, {
    chatId: parsed.data.chat_id,
    title: parsed.data.title.trim(),
    hook: parsed.data.hook?.trim(),
    script: parsed.data.script?.trim(),
  });

  return NextResponse.json(video);
}
