import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createChat } from "@/lib/db/queries";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const chat = await createChat(user.id);
  return NextResponse.json(chat, { status: 201 });
}
