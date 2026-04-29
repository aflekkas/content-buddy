import { errorResponse, jsonResponse, requireAuth } from "@/lib/api";
import { searchChats } from "@/lib/db/queries";
import { buildRateLimitHeaders, checkSearchRateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const rateLimit = await checkSearchRateLimit();
  const rateLimitHeaders = buildRateLimitHeaders(rateLimit);
  if (!rateLimit.allowed) {
    return errorResponse(
      "rate_limited",
      429,
      { retryAfter: rateLimit.retryAfter },
      { headers: rateLimitHeaders },
    );
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";

  if (q.trim().length < 2) {
    return jsonResponse({ results: [] }, { headers: rateLimitHeaders });
  }

  const results = await searchChats(q, 20);
  return jsonResponse({ results }, { headers: rateLimitHeaders });
}
