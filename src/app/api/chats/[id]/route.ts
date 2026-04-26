import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteChat, renameChat } from "@/lib/db/queries";

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

  const body = (await req.json().catch(() => null)) as { title?: unknown } | null;
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }

  const { id } = await params;
  await renameChat(id, user.id, title.slice(0, 200));
  return NextResponse.json({ ok: true });
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
  await deleteChat(id, user.id);
  return NextResponse.json({ ok: true });
}
