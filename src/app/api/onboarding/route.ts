import { NextResponse } from "next/server";
import { generateText } from "ai";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { buildCreatorProfileBlock } from "@/lib/anthropic";
import {
  addChatUsage,
  appendMessage,
  createChat,
  getDecryptedProviderKey,
  hasCompletedOnboarding,
  markOnboarded,
  setChatTitle,
  setActiveModel,
  setProviderKey,
  upsertUserProfile,
} from "@/lib/db/queries";
import { getModel } from "@/lib/model-dispatch";
import { validateProviderKey } from "@/lib/provider-validate";
import { NICHE_IDS, ONBOARDING_PLATFORM_IDS } from "@/lib/niches";
import {
  PROVIDERS,
  PROVIDER_IDS,
  defaultModel,
  type ProviderId,
} from "@/lib/providers";

export const maxDuration = 60;

const PayloadSchema = z.object({
  platforms: z.array(z.enum(ONBOARDING_PLATFORM_IDS as [string, ...string[]])).min(1),
  niche_primary: z.enum(NICHE_IDS as [string, ...string[]]),
  niche_secondary: z
    .array(z.enum(NICHE_IDS as [string, ...string[]]))
    .max(2)
    .default([]),
  channel_pitch: z.string().min(3).max(500),
  audience_stage: z.enum(["starting", "growing", "established", "large"]),
  primary_goal: z.enum(["grow", "monetize", "brand", "traffic", "experiment"]),
  provider: z.enum(PROVIDER_IDS as [ProviderId, ...ProviderId[]]),
  api_key: z.string().min(20),
});

const SEED_SYSTEM = `You are Content Buddy, an expert advisor for short-form video creators.
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

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (await hasCompletedOnboarding(user.id)) {
    return NextResponse.json({ error: "already_onboarded" }, { status: 409 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const parsed = PayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;

  // Runtime prefix check — catches key/provider mismatch before hitting the API.
  if (!data.api_key.startsWith(PROVIDERS[data.provider].keyPrefix)) {
    return NextResponse.json(
      { error: "invalid_key_format", provider: data.provider },
      { status: 400 },
    );
  }

  const profileFields = {
    platforms: data.platforms,
    niche_primary: data.niche_primary,
    niche_secondary: data.niche_secondary,
    channel_pitch: data.channel_pitch.trim(),
    audience_stage: data.audience_stage,
    primary_goal: data.primary_goal,
  } as const;

  await upsertUserProfile(user.id, profileFields);

  // Validate the key against the provider's API before persisting it.
  const validation = await validateProviderKey(data.provider, data.api_key);
  if (!validation.ok && validation.reason === "auth") {
    return NextResponse.json(
      {
        error: "invalid_key",
        provider: data.provider,
        message: `That key didn't work. Double-check it on the ${PROVIDERS[data.provider].label} console and try again.`,
      },
      { status: 402 },
    );
  }
  // Network/timeout: continue — we can't disprove the key is valid.

  // Persist the key so subsequent chat requests can use it.
  await setProviderKey(user.id, data.provider, data.api_key);

  // Read it back through the standard decryption path (mirrors chat route).
  const apiKey = await getDecryptedProviderKey(user.id, data.provider);
  if (!apiKey) {
    return NextResponse.json(
      { error: "missing_key", provider: data.provider },
      { status: 402 },
    );
  }

  const profileBlock = buildCreatorProfileBlock({
    platforms: profileFields.platforms,
    niche_primary: profileFields.niche_primary,
    niche_secondary: profileFields.niche_secondary,
    channel_pitch: profileFields.channel_pitch,
    audience_stage: profileFields.audience_stage,
    primary_goal: profileFields.primary_goal,
  });

  let artifact: string;
  let usage: Awaited<ReturnType<typeof generateText>>["usage"] | null = null;
  try {
    const result = await generateText({
      model: getModel(data.provider, defaultModel(data.provider), apiKey),
      messages: [
        { role: "system", content: SEED_SYSTEM },
        { role: "user", content: profileBlock },
      ],
    });
    artifact = result.text.trim();
    usage = result.usage;
  } catch {
    return NextResponse.json(
      {
        error: "generation_failed",
        message: "Couldn't generate your starter script. Try again in a moment.",
      },
      { status: 502 },
    );
  }

  if (!artifact) {
    return NextResponse.json(
      {
        error: "empty_artifact",
        message: "Got an empty response. Try again.",
      },
      { status: 502 },
    );
  }

  const chat = await createChat(user.id);
  const title = extractTitle(artifact) ?? `${data.niche_primary} starter pack`;
  await setChatTitle(chat.id, title);
  await appendMessage(chat.id, "assistant", artifact);

  if (usage) {
    const nonCacheInput = usage.inputTokenDetails?.noCacheTokens;
    await addChatUsage(chat.id, {
      inputTokens: nonCacheInput ?? Math.max(0, usage.inputTokens ?? 0),
      outputTokens: usage.outputTokens ?? 0,
      cacheReadTokens: usage.inputTokenDetails?.cacheReadTokens ?? 0,
      cacheCreationTokens: usage.inputTokenDetails?.cacheWriteTokens ?? 0,
    });
  }

  await setActiveModel(user.id, data.provider, defaultModel(data.provider));
  await markOnboarded(user.id);

  return NextResponse.json({ chatId: chat.id });
}

function extractTitle(markdown: string): string | null {
  const match = markdown.match(/\*\*Title:\*\*\s*(.+)/);
  if (!match) return null;
  return match[1].trim().slice(0, 80) || null;
}
