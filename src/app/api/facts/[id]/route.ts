import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteUserFact } from "@/lib/db/queries";

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
  await deleteUserFact(user.id, id);
  return NextResponse.json({ ok: true });
}
