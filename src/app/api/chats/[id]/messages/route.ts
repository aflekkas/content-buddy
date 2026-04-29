import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getChat, getCachedMessages } from "@/lib/db/queries";

export async function GET(
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

  const { id } = await params;

  const chat = await getChat(id, user.id);
  if (!chat) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const beforeParam = searchParams.get("before") ?? undefined;
  const limitParam = searchParams.get("limit");

  // Validate `before` is a valid ISO timestamp if present.
  if (beforeParam !== undefined) {
    const ts = Date.parse(beforeParam);
    if (isNaN(ts)) {
      return NextResponse.json(
        { error: "invalid before parameter" },
        { status: 422 },
      );
    }
  }

  // Parse and clamp limit.
  const limit = limitParam
    ? Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 100)
    : 50;

  const page = await getCachedMessages(id, { limit, before: beforeParam });

  return NextResponse.json(page);
}
