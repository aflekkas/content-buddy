import type { User } from "@supabase/supabase-js";
import type { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { unauthorized } from "./responses";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type AuthResult =
  | { ok: true; user: User; supabase: SupabaseServerClient }
  | { ok: false; response: NextResponse };

export async function requireAuth(): Promise<AuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, response: unauthorized() };
  return { ok: true, user, supabase };
}

export function requireCronSecret(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return unauthorized();
  }
  return null;
}
