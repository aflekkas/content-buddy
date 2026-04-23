import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  getUserProfile,
  listUserFacts,
  upsertUserProfile,
} from "@/lib/db/queries";

const PatchBody = z.object({
  bio: z.string().max(2000),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [profile, facts] = await Promise.all([
    getUserProfile(user.id),
    listUserFacts(user.id),
  ]);

  return NextResponse.json({
    bio: profile?.bio ?? "",
    facts,
  });
}

export async function PATCH(req: Request) {
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

  const profile = await upsertUserProfile(user.id, parsed.data.bio);
  return NextResponse.json({ bio: profile.bio });
}
