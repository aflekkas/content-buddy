import { errorResponse, jsonResponse, requireAuth } from "@/lib/api";
import { getUserProfile, upsertUserProfile } from "@/lib/db/queries";
import { distillVoiceForUser } from "@/lib/voice-dna";
import {
  checkDailyAiTokenBudget,
  dailyBudgetHeaders,
  recordDailyAiTokenUsage,
} from "@/lib/ai-usage";
import {
  buildRateLimitHeaders,
  checkVoiceDistillRateLimit,
} from "@/lib/rate-limit";

export async function POST() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const profile = await getUserProfile(auth.user.id);
  if (!profile) {
    return errorResponse("profile_not_found", 404);
  }

  const rateLimit = await checkVoiceDistillRateLimit();
  const rateLimitHeaders = buildRateLimitHeaders(rateLimit);
  if (!rateLimit.allowed) {
    return errorResponse(
      "rate_limited",
      429,
      { retryAfter: rateLimit.retryAfter },
      { headers: rateLimitHeaders },
    );
  }

  const budget = await checkDailyAiTokenBudget(auth.user.id);
  if (!budget.allowed) {
    return errorResponse(
      "token_budget_exceeded",
      429,
      { resetAt: budget.resetAt },
      { headers: { ...rateLimitHeaders, ...dailyBudgetHeaders(budget) } },
    );
  }

  try {
    const result = await distillVoiceForUser(auth.user.id, profile);
    if (!result) {
      return errorResponse("no_corpus", 400, {
        message: "Add voice_samples or save a few drafts first.",
      });
    }
    await recordDailyAiTokenUsage(auth.user.id, result.usage);
    const updated = await upsertUserProfile(auth.user.id, {
      voice_dna: result.voiceDna,
    });
    return jsonResponse({ voice_dna: updated.voice_dna });
  } catch (error) {
    return errorResponse("distill_failed", 500, {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
