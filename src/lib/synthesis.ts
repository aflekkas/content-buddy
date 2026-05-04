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

export const BEST_PRACTICES = `LinkedIn craft, 2025-2026, distilled from algorithm reverse-engineers (van der Blom, AuthoredUp, Originality.AI) and top operator-voice ghostwriters (Welsh, Acosta, Alic, Sordell, Reed). Treat every rule as load-bearing.

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
15. If the post is a hot_take, ship it short and skip the CTA. Invite pushback in tone, don't beg for it in copy.
16. Replacement phrasings (use these instead of the AI-tells):
    - instead of "It's important to note that..." -> just state it.
    - instead of "Let's dive in" -> name what you're about to show. ("Three things changed.")
    - instead of "In today's fast-paced world" -> drop the throat-clear. Open with the claim.
    - instead of "leverage" -> use, lean on, exploit, ride.
    - instead of "utilize" -> use.
    - instead of "streamline" -> cut, simplify, collapse.
    - instead of "harness" -> use, point, aim.
    - instead of "delve into" -> look at, dig into, pick apart.
    - instead of "robust" -> name the property (fast, reliable, hard to break).
    - instead of "seamless" -> "no setup," "one click," "you don't notice it."
    - instead of "comprehensive" -> name what it covers ("everything from auth to billing").
    - instead of em dash — use comma, period, parentheses, or colon.
17. Self-critique pass before returning: reread your draft once. If line 1 is generic, rewrite it. If any banned word slipped in, swap it. If three lines in a row are the same length, rewrite one. If the close restates what you already said, cut it. Only then return.`;

export const POST_TYPE_FRAMEWORK = `Choose ONE post_type that best fits the source signal AND the user's preferred_post_types. If a postType override is provided, use it. Each shape:

- hot_take: punchy opinion, no scaffolding. 150-400 chars. State the take, give the one-sentence rationale. No CTA.
- story: scene -> conflict -> turn -> takeaway -> 1 actionable line -> question. Personal, vulnerable, specific. 1000-1800 chars.
- framework: name the method, list 3-5 components (each 1-2 lines), show the result, optional "save this" close. 1000-1500 chars.
- teardown: pick a specific decision/launch/post/announcement, show what worked, what didn't, what generalizes. 1200-2000 chars. Real names where possible.
- listicle: hook with a specific number, 1-line lead, 5-12 numbered items each <120 chars, optional "save this" close. 800-2000 chars.
- contrarian: hook = the contrarian claim. Then "what most people believe," "why that's wrong," "what to do instead." 600-1200 chars. Invite pushback.
- question: open question to the audience tied to a one-sentence reason it matters. Short. No CTA needed beyond the question itself.
- lesson: setup of an experience -> what went wrong -> the realization -> the rule you now follow. 800-1500 chars. Vulnerability + authority combo.

If the source is a news/announcement signal, default to hot_take or contrarian (industry commentary). If the source has hard numbers, lean teardown or framework. If the source is a milestone/launch, lean story or build-in-public-style lesson.`;

export const HOUSE_VOICE = `Default voice baseline (use when voice_samples is empty; otherwise treat voice_samples as the stronger signal):

- First person, singular ("I"), past tense for stories. Never "we" unless literally describing a team action.
- Sentence-length variance: short lines (3-7 words) interleaved with medium lines (10-18 words). One long line per post max.
- Specifics over abstractions: dates, dollar amounts, named tools, named roles, named outcomes. "Last Tuesday," "$40k deal," "Series A," not "recently," "a meaningful loss," "an early-stage company."
- Confident assertions, no hedging. Cut "I think," "in my opinion," "kind of," "sort of," "arguably."
- Contractions on (don't, won't, you're, here's) unless formality is 5.
- One idea per post. If you can split it into two posts, you should.
- Close lands. Either a one-line punch ("That was the real cost.") or a single specific question. Never both.
- Lowercase asides are fine ("brutal."). Single-sentence paragraphs are fine. Half-sentence fragments are fine when they hit.
- The reader should be able to imagine you saying it out loud.`;

export const EXEMPLARS = `Worked exemplars. Each is one full post showing what good looks like for that type. Match the *shape, density, and voice signature* — not the topic or word choice.

--- hot_take ---
Most "AI strategy" decks are theater.

If your team can't ship one workflow this quarter using off-the-shelf models, the deck won't save you. The winners are skipping the strategy phase entirely and learning by deploying.

--- story ---
A founder told me last Thursday that he was about to fire his head of sales.

Numbers were down. Pipeline was thin. He'd already drafted the Slack message.

We pulled the call recordings instead. Forty-three of them, from the last six weeks.

The head of sales was running the playbook. The playbook was the problem. It hadn't been updated since pre-PMF, when the deals were 4x smaller and ran in 11 days, not 47.

He didn't fire the rep. He rewrote the playbook over the weekend. Pipeline doubled in three weeks.

The lesson I keep relearning: when a high performer suddenly underperforms, audit the system before the person.

What's the last "people problem" that turned out to be a process problem for you?

--- framework ---
The 4-question framework I run every founder through before they hire a VP of Sales.

Most hiring is fixing the wrong thing. These four questions surface what's actually broken.

1. Is your founder-led pipeline > $1M ARR? If no, hire a senior rep, not a VP.
2. Can you describe your ICP in one sentence without "and"? If no, the VP will pick one for you.
3. Do you have a working playbook another human could run? If no, the VP rewrites it month one anyway.
4. Are you ready to lose 30% of pipeline visibility for 90 days? Because you will.

If you said no to two or more, the VP isn't the next hire. The clarity is.

Save this for the next time someone tells you "we need a sales leader."

--- teardown ---
Cursor just shipped Tab Composer. I tried it for 6 hours yesterday on a Next.js 16 migration.

What worked:
- Multi-file diffs that actually compile. Three of four edits passed type check first try.
- The cancel-and-rewrite loop is fast enough that it replaced my "draft, paste, fix" cycle.

What broke:
- Refactors across server / client boundaries hallucinated React Server Component constraints.
- It wrote tests that mocked the function under test.

What generalizes: the closer the agent stays to a single file with strict types, the better. Cross-file reasoning is still where humans earn rent.

I'm keeping it on for greenfield, off for migrations.

--- listicle ---
9 things I wish I knew before raising a seed round.

1. Lead investors don't read decks past slide 4. Make 4 great slides.
2. "We'll get back to you next week" means no.
3. The associate is not your buyer. Ask politely to meet a partner.
4. Your first check sets the comp for every check after it.
5. SAFEs stack. Three at $10M cap on the same call sheet hurts your Series A.
6. Take the meeting with the angel who's been in your seat. Skip the family office "intro call."
7. Diligence is faster than you think. Be ready week one.
8. The "no" with feedback is worth more than the "maybe" with none.
9. Close fast. A round that drags loses momentum and price.

Save this if you're prepping a deck this quarter.

--- contrarian ---
Hiring a Head of AI is a category error in 2026.

Everyone wants one. Nobody knows what the role actually does.

Here's the pattern I see: the title gets created to signal seriousness to the board, the person spends month one writing a strategy nobody asked for, and month six gets quietly merged into engineering.

What works instead: an "AI engineer in residence" inside whatever team has the most painful workflow. Real shipped tooling beats a strategy doc every time.

Push back on this if you've seen it work — I want to be wrong.

--- question ---
For founders who've actually scaled past $5M ARR with a remote team:

What was the first thing that broke that you didn't see coming?

I'm not asking about the obvious stuff (hiring, comms). I want the weird one — the thing you would have laughed at someone for warning you about in year one.

--- lesson ---
I once spent four months building the wrong feature because I didn't ask one question.

A customer told me on a call: "we'd buy if you had X." I went back, scoped X, and shipped it. They didn't buy.

The question I should have asked: "would you sign a contract today if X existed?"

Without that, "we'd buy" is conversational politeness. The customer wasn't lying — they just hadn't thought past the request.

The rule I now follow: every "we'd buy if" gets a "would you sign today if" in the same call. About 80% of those features stop mattering the moment you ask.`;

export function styleBlock(profile: UserProfileRow | null): string {
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

export function audienceBlock(profile: UserProfileRow | null): string {
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
    `<house_voice>\n${HOUSE_VOICE}\n</house_voice>`,
    `<exemplars>\n${EXEMPLARS}\n</exemplars>`,
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
