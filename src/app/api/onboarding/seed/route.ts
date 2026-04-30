import { revalidateTag } from "next/cache";
import { generateText } from "ai";
import { errorResponse, jsonResponse, requireAuth } from "@/lib/api";
import { buildCreatorProfileBlock } from "@/lib/anthropic";
import {
  addChatUsage,
  appendMessage,
  createChat,
  getActiveModel,
  getDecryptedProviderKey,
  getUserProfile,
  markOnboarded,
  setChatTitle,
} from "@/lib/db/queries";
import { getModel } from "@/lib/model-dispatch";
import {
  buildRateLimitHeaders,
  checkOnboardingSeedRateLimit,
} from "@/lib/rate-limit";

export const maxDuration = 60;

const SEED_SYSTEM = `You are Shortform Studio, an expert advisor for short-form video creators.
The user just finished onboarding. Generate their first artifact: three distinct hook ideas, then one full 30-second script ready to film.

Output STRICT markdown in this shape (no preamble, no closing remarks):

## Three hooks for you

1. **[Hook label]** — exact words for first 1-3s
2. **[Hook label]** — exact words for first 1-3s
3. **[Hook label]** — exact words for first 1-3s

## Your first script

**Title:** short working title

**Hook (0-3s):** exact words

**Beats:**
- 3-10s: ...
- 10-20s: ...
- 20-30s: ...

**Why this fits:** one sentence tying the script to the creator's profile.

Tailor everything to the <creator_profile> block in the user message. Use vocabulary the creator will recognize. Be concrete and specific — no "do a talking head".`;

export async function POST() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const rateLimit = await checkOnboardingSeedRateLimit();
  if (!rateLimit.allowed) {
    return errorResponse(
      "rate_limited",
      429,
      { retryAfter: rateLimit.retryAfter },
      { headers: buildRateLimitHeaders(rateLimit) },
    );
  }

  const profile = await getUserProfile(user.id);
  const hasProfile =
    Boolean(profile?.niche_primary) ||
    Boolean(profile?.channel_pitch?.trim()) ||
    Boolean(profile?.platforms?.length);

  if (!hasProfile) {
    return errorResponse("insufficient_profile", 400);
  }

  const { provider, model } = await getActiveModel(user.id);
  const apiKey = await getDecryptedProviderKey(user.id, provider);
  if (!apiKey) {
    return errorResponse("missing_key", 402, { provider });
  }

  const profileBlock = buildCreatorProfileBlock({
    platforms: profile?.platforms ?? [],
    niche_primary: profile?.niche_primary ?? null,
    niche_secondary: profile?.niche_secondary ?? [],
    channel_pitch: profile?.channel_pitch ?? "",
    audience_stage: profile?.audience_stage ?? null,
    primary_goal: profile?.primary_goal ?? null,
  });

  let artifact: string;
  let usage: Awaited<ReturnType<typeof generateText>>["usage"] | null = null;
  try {
    const result = await generateText({
      model: getModel(provider, model, apiKey),
      messages: [
        { role: "system", content: SEED_SYSTEM },
        { role: "user", content: profileBlock },
      ],
    });
    artifact = result.text.trim();
    usage = result.usage;
  } catch {
    return errorResponse("generation_failed", 502, {
      message: "Couldn't generate your starter script. Try again in a moment.",
    });
  }

  if (!artifact) {
    return errorResponse("empty_artifact", 502, {
      message: "Got an empty response. Try again.",
    });
  }

  const chat = await createChat(user.id);
  const title =
    extractTitle(artifact) ??
    `${profile?.niche_primary ?? "creator"} starter pack`;
  await setChatTitle(chat.id, title);
  await appendMessage(chat.id, "assistant", artifact);
  await markOnboarded(user.id);
  revalidateTag(`chat:${chat.id}:messages`, "max");

  if (usage) {
    const nonCacheInput = usage.inputTokenDetails?.noCacheTokens;
    await addChatUsage(chat.id, {
      inputTokens: nonCacheInput ?? Math.max(0, usage.inputTokens ?? 0),
      outputTokens: usage.outputTokens ?? 0,
      cacheReadTokens: usage.inputTokenDetails?.cacheReadTokens ?? 0,
      cacheCreationTokens: usage.inputTokenDetails?.cacheWriteTokens ?? 0,
    });
  }

  return jsonResponse({ chatId: chat.id });
}

function extractTitle(markdown: string): string | null {
  const match = markdown.match(/\*\*Title:\*\*\s*(.+)/);
  if (!match) return null;
  return match[1].trim().slice(0, 80) || null;
}
