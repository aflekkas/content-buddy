import { generateText } from "ai";
import { z } from "zod";
import {
  POST_TYPES,
  type PostType,
  type SignalRow,
  type UserProfileRow,
} from "@/lib/db/types";
import { getModel } from "@/lib/model-dispatch";

const RelevanceSchema = z.object({
  score: z.number().min(0).max(1),
  summary: z.string().min(1).max(240),
});

const SynthesisOutputSchema = z.object({
  post_type: z.enum(POST_TYPES),
  body: z.string().min(1),
});

export type SynthMode = "news";

const FORMALITY_DESCRIPTORS: Record<number, string> = {
  1: "ultra-casual, lowercase asides welcome, talks like a DM",
  2: "casual, contraction-heavy, conversational",
  3: "neutral operator voice, confident but not stiff",
  4: "polished, occasional contractions, executive-presentation tight",
  5: "formal-exec, no contractions, full sentences, board-ready",
};

const ELABORATION_DESCRIPTORS: Record<number, string> = {
  1: "tight, punchy, every line earns its place",
  2: "balanced, room for one example or aside per beat",
  3: "expansive, multiple examples, longer scene-setting",
};

function getOpenAIModel() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("missing_openai_key_env");
  }
  return getModel("openai", "gpt-4o-mini", apiKey);
}

function profileLine(value: string | null) {
  return value?.trim() || "not specified";
}

function signalText(signal: SignalRow) {
  const rawText = signal.raw.text;
  if (typeof rawText === "string" && rawText.trim()) return rawText.trim();
  return JSON.stringify(signal.raw).slice(0, 2000);
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return JSON.parse(fenced?.[1] ?? trimmed);
}

function voiceFewShots(samples: string | null): string | null {
  const trimmed = samples?.trim();
  if (!trimmed) return null;
  return `Here are examples of how the user writes on LinkedIn. Match this voice closely (cadence, sentence length, vocabulary, what they don't do):\n\n${trimmed.slice(0, 6000)}`;
}

export async function scoreRelevance(args: {
  signalText: string;
  niche: string | null;
  voiceNotes: string | null;
}): Promise<{ score: number; summary: string }> {
  const model = getOpenAIModel();
  const { text } = await generateText({
    model,
    messages: [
      {
        role: "system",
        content: `You score how relevant a news item is to a creator's LinkedIn audience. Niche: ${profileLine(args.niche)}. Voice: ${profileLine(args.voiceNotes)}. Return JSON {score: 0..1, summary: 1-line}.`,
      },
      { role: "user", content: args.signalText.slice(0, 4000) },
    ],
  });

  const parsed = RelevanceSchema.parse(extractJson(text));
  return { score: parsed.score, summary: parsed.summary };
}

const BEST_PRACTICES = `LinkedIn craft, 2025-2026, distilled from algorithm reverse-engineers (van der Blom, AuthoredUp, Originality.AI) and top operator-voice ghostwriters (Welsh, Acosta, Alic, Sordell, Reed). Treat every rule as load-bearing.

1. First line is the hook. Under 140 chars so it never wraps on mobile. 8-12 words ideal. Hook patterns: contrarian, curiosity gap, stat shock, story cold open, list promise, vulnerability, before/after. Never open with "Are you a [audience]?" or "In today's [anything]." Reread line 1 alone before shipping — if it could title a generic blog post, rewrite it.
2. Default length 1200-1800 chars. Hot takes are the only exception (under 400). Case studies stretch to 2500 only when the specifics earn it.
3. One thought per line. Blank line between thoughts. Most paragraphs are 1-3 sentences. Vary line length so it doesn't read as parody broetry.
4. Sentence case throughout. No Title Case Headers Inside Posts. Single-word ALL CAPS sparingly; never on whole lines.
5. Be concrete. Real numbers, real tool names, real dates, real job titles. Generic framework posts underperform specific case posts by 3-4x. Every concrete claim must trace back to something in <facts> or the user's own context.
6. CTAs that work: one specific question tied to the post's premise; "save this if [specific situation]" (saves are a heavily weighted ranking signal); a "P.S." with one concrete next step. CTAs that are deboosted: "Like if you agree," "Comment YES," "Tag a friend," "Repost if helpful," "Follow for more," generic "Thoughts?".
7. Hashtags: 0-3, niche only. More than 3 cuts reach ~70%.
8. Emojis: 0-3 per post max. Visual anchors before bullets or labels, never decoration. Never in titles. Zero emojis is a valid choice.
9. Bullets: "->" or "→" for steps/sequences, "-" or "•" for plain lists, numbers (1. 2. 3.) for ordered listicles. Don't mix markers within a single list.
10. External links: include only when include_links is true AND a link adds real value. Put it on its own line below the fold (after the punchline, not in the hook).
11. Voice: first person, operator/founder/IC. Past-tense narration of real events beats present-tense advice. Write to one specific reader, not to "founders" as a category. Confident not defensive, curious not preachy. Lowercase asides are fine.
12. Audience call-outs ("Founders:", "B2B SaaS marketers:") only when (a) the segment is specific AND (b) the post is genuinely actionable for them. Never as a hailing device for reach. Do NOT name-drop the audience just because target_audience is set.
13. AI-tell kill list — never output any of these:
    - phrases: "in today's fast-paced world," "let's dive in," "let's unpack," "let's explore," "it's important to note that," "in essence," "in conclusion," "to summarize," "game-changer," "game-changing," "unlock the power of," "unlock your potential," "navigate the complexities of," "at its core," "when it comes to," "I hope this helps!", "Remember: ...". Avoid "It's not about X. It's about Y." as a recurring pattern (a single intentional use is fine).
    - words used as a tic: delve, leverage, utilize, harness, streamline, underscore, pivotal, robust, seamless, cutting-edge, landscape, realm, tapestry, synergy, testament, multifaceted, foster, paramount, comprehensive, holistic, ecosystem (when not literal), journey (metaphorical), elevate.
    - punctuation: NO em dashes — use commas, periods, parentheses, or colons instead. No smart/curly quotes from a paste.
14. No three-bullet lists where every bullet is the same length. No paragraph stacks where every paragraph starts with the same verb form. No closing "summary" line that restates the post.
15. If the post is a hot_take, ship it short and skip the CTA. Invite pushback in tone, don't beg for it in copy.`;

const POST_TYPE_FRAMEWORK = `Choose ONE post_type that best fits the source signal AND the user's preferred_post_types. If a postType override is provided, use it. Each shape:

- hot_take: punchy opinion, no scaffolding. 150-400 chars. State the take, give the one-sentence rationale. No CTA.
- story: scene -> conflict -> turn -> takeaway -> 1 actionable line -> question. Personal, vulnerable, specific. 1000-1800 chars.
- framework: name the method, list 3-5 components (each 1-2 lines), show the result, optional "save this" close. 1000-1500 chars.
- teardown: pick a specific decision/launch/post/announcement, show what worked, what didn't, what generalizes. 1200-2000 chars. Real names where possible.
- listicle: hook with a specific number, 1-line lead, 5-12 numbered items each <120 chars, optional "save this" close. 800-2000 chars.
- contrarian: hook = the contrarian claim. Then "what most people believe," "why that's wrong," "what to do instead." 600-1200 chars. Invite pushback.
- question: open question to the audience tied to a one-sentence reason it matters. Short. No CTA needed beyond the question itself.
- lesson: setup of an experience -> what went wrong -> the realization -> the rule you now follow. 800-1500 chars. Vulnerability + authority combo.

If the source is a news/announcement signal, default to hot_take or contrarian (industry commentary). If the source has hard numbers, lean teardown or framework. If the source is a milestone/launch, lean story or build-in-public-style lesson.`;

function styleBlock(profile: UserProfileRow | null): string {
  const formality = profile?.formality ?? 3;
  const elaboration = profile?.elaboration ?? 2;
  const lengthPref = profile?.length_pref ?? 1500;
  const preferred = profile?.preferred_post_types ?? [];
  const avoidPhrases = profile?.avoid_phrases?.trim();
  const includeLinks = profile?.include_links ?? false;

  const lines = [
    `formality: ${formality}/5 (${FORMALITY_DESCRIPTORS[formality] ?? FORMALITY_DESCRIPTORS[3]})`,
    `elaboration: ${elaboration}/3 (${ELABORATION_DESCRIPTORS[elaboration] ?? ELABORATION_DESCRIPTORS[2]})`,
    `target_length_chars: ~${lengthPref} (the central tendency, not a hard cap)`,
    `preferred_post_types: ${preferred.length > 0 ? preferred.join(", ") : "no preference — pick the best fit for the source"}`,
    `include_links: ${includeLinks ? "true (drop the source URL on its own line below the fold when it adds value)" : "false (do not include any URL in the body)"}`,
  ];
  if (avoidPhrases) {
    lines.push(`avoid_phrases (user-supplied, must NOT appear):\n${avoidPhrases}`);
  }
  return `<style_preferences type="soft_hints">\n${lines.join("\n")}\n</style_preferences>`;
}

function audienceBlock(profile: UserProfileRow | null): string {
  const audience = profile?.target_audience?.trim() || "general professional";
  const goal = profile?.post_goal?.trim() || "informative";

  return `<audience_context type="soft_hints">
target_audience: ${audience}
post_goal: ${goal}

Soft hints. Use them when they fit naturally. Do NOT name-drop the audience ("attention founders!"), do NOT shoehorn the goal, do NOT bend the post to the audience at the cost of source fidelity. The post should read like the operator wrote it for themselves and the right audience found it.
</audience_context>`;
}

function creatorProfileBlock(profile: UserProfileRow | null): string {
  return `<creator_profile type="ground_truth">
niche: ${profileLine(profile?.niche ?? null)}
voice_notes: ${profileLine(profile?.voice_notes ?? null)}
</creator_profile>`;
}

function factsBlock(signals: SignalRow[]): string {
  const sources = signals
    .map(
      (signal, index) =>
        `Source ${index + 1} (${signal.url}, posted ${signal.posted_at}):\n${signalText(signal)}`,
    )
    .join("\n\n");

  return `<facts type="ground_truth">
${sources.slice(0, 12000)}
</facts>`;
}

function buildSynthesisSystemPrompt(args: {
  profile: UserProfileRow | null;
  signals: SignalRow[];
  postType?: PostType;
}): string {
  const overrideClause = args.postType
    ? `\nOVERRIDE: post_type MUST be "${args.postType}". Pick that shape.`
    : "";

  return [
    `<role>
You are a LinkedIn ghostwriter for one operator. Convert the source signals into ONE publish-ready LinkedIn post in the operator's voice. Your output will be posted as-is. The bar is parity with a top human ghostwriter — generic LinkedIn-AI slop is failure.${overrideClause}
</role>`,
    `<best_practices>\n${BEST_PRACTICES}\n</best_practices>`,
    `<post_type_framework>\n${POST_TYPE_FRAMEWORK}\n</post_type_framework>`,
    factsBlock(args.signals),
    creatorProfileBlock(args.profile),
    styleBlock(args.profile),
    audienceBlock(args.profile),
    `<output_contract>
Return ONLY a JSON object with two fields, no markdown fences, no preamble, no commentary:
{
  "post_type": one of ${POST_TYPES.map((t) => `"${t}"`).join(" | ")},
  "body": the publish-ready LinkedIn post body as a single string with real line breaks (use \\n in JSON)
}

The body must be the post body itself — no headings, no quotes wrapping it, no "Here's a draft:". Lead with a sharp first line under 140 chars (the hook decides whether anyone reads line 2). Use line breaks liberally for scannability.
</output_contract>`,
  ].join("\n\n");
}

export async function synthesizeFromSignals(args: {
  mode?: SynthMode;
  signals: SignalRow[];
  profile: UserProfileRow | null;
  postType?: PostType;
}): Promise<{ body: string; post_type: PostType }> {
  if (args.signals.length === 0) {
    throw new Error("signals required");
  }

  const model = getOpenAIModel();
  const samples = voiceFewShots(args.profile?.voice_samples ?? null);
  const systemPrompt = buildSynthesisSystemPrompt({
    profile: args.profile,
    signals: args.signals,
    postType: args.postType,
  });

  const messages: Array<{ role: "system" | "user"; content: string }> = [
    { role: "system", content: systemPrompt },
  ];
  if (samples) {
    messages.push({ role: "user", content: samples });
  }
  messages.push({
    role: "user",
    content:
      "Write the post now. Return only the JSON object specified in <output_contract>.",
  });

  const { text } = await generateText({ model, messages });

  try {
    const parsed = SynthesisOutputSchema.parse(extractJson(text));
    return { body: parsed.body.trim(), post_type: parsed.post_type };
  } catch {
    // Fallback: model returned bare body instead of JSON. Salvage it.
    const fallbackBody = text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```$/i, "")
      .trim();
    return {
      body: fallbackBody,
      post_type: args.postType ?? "hot_take",
    };
  }
}
