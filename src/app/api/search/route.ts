import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchChats } from "@/lib/db/queries";
import {
  buildRateLimitHeaders,
  checkSearchRateLimit,
} from "@/lib/rate-limit";

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkSearchRateLimit();
  const rateLimitHeaders = buildRateLimitHeaders(rateLimit);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "rate_limited", retryAfter: rateLimit.retryAfter },
      { status: 429, headers: rateLimitHeaders },
    );
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";

  if (q.trim().length < 2) {
    return NextResponse.json({ results: [] }, { headers: rateLimitHeaders });
  }

  const results = await searchChats(q, 20);
  return NextResponse.json({ results }, { headers: rateLimitHeaders });
}
