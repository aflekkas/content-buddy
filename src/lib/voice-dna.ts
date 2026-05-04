import { generateText } from "ai";
import { listRecentDrafts } from "@/lib/db/queries";
import { getModel } from "@/lib/model-dispatch";
import type { UserProfileRow } from "@/lib/db/types";

const DISTILL_PROMPT = `You analyze a writer's LinkedIn posts and produce a structured "voice DNA" doc that another model will use to write in their voice.

The doc must be specific, falsifiable, and short enough to read in 30 seconds. It is NOT a description of the topics they cover; it is a description of HOW they write — sentence rhythm, signature moves, specific tics.

Use exactly this format:

## Signature openers
- [3-5 bullet patterns the writer actually uses for their first line. Quote a real opener from the samples after each pattern.]

## Sentence rhythm
- Average sentence length: [number] words.
- Variance: [tight 5-12 / moderate 4-20 / wide 3-30+].
- Fragment frequency: [never / occasional / frequent].
- Most common paragraph length: [1 / 2 / 3 / 4+] sentences.

## Vocabulary signature
- Words / phrases this writer uses repeatedly: [3-5, with frequency notes if visible].
- Words / phrases this writer NEVER uses (implicit ban list): [3-5; common AI-tells they avoid + their actual avoidance pattern].
- Use of contractions: [heavy / moderate / rare / never].
- Use of first person: [I / we / both / neither].

## Recurring structural moves
- [3-5 concrete moves they pull off, e.g. "opens with a line break + parenthetical sub-hook on line 2"; "ends with a one-word punch line"; "uses '→' for sequences"].

## Close patterns
- [What their last line tends to be: a question / a one-word punch / a P.S. / a CTA / no CTA. Quote 2-3 real closes.]

## What this voice does NOT do
- [3-5 things this writer specifically avoids — in concrete terms, e.g. "never uses em dashes", "never opens with a question", "never says 'leverage' or 'unlock'", "no engagement-bait CTAs"]

Write only the doc. No preamble. No commentary. No "here is the analysis."`;

export async function distillVoiceProfile(args: {
  voiceSamples: string | null;
  voiceNotes: string | null;
  recentDraftBodies: string[];
  apiKey: string;
}): Promise<string | null> {
  const samples = args.voiceSamples?.trim() ?? "";
  const drafts = args.recentDraftBodies
    .map((b, i) => `--- recent draft ${i + 1} ---\n${b}`)
    .join("\n\n");
  const notes = args.voiceNotes?.trim();

  if (!samples && !drafts) return null;

  const corpusBlocks: string[] = [];
  if (notes) {
    corpusBlocks.push(`<voice_notes>\n${notes}\n</voice_notes>`);
  }
  if (samples) {
    corpusBlocks.push(`<voice_samples>\n${samples.slice(0, 8000)}\n</voice_samples>`);
  }
  if (drafts) {
    corpusBlocks.push(`<recent_drafts>\n${drafts.slice(0, 6000)}\n</recent_drafts>`);
  }

  const model = getModel("openai", "gpt-4o-mini", args.apiKey);
  const { text } = await generateText({
    model,
    messages: [
      { role: "system", content: DISTILL_PROMPT },
      { role: "user", content: corpusBlocks.join("\n\n") },
    ],
    temperature: 0.3,
  });

  return text.trim() || null;
}

export async function distillVoiceForUser(
  userId: string,
  profile: UserProfileRow,
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("missing_openai_key_env");

  const drafts = await listRecentDrafts(userId, { limit: 8 });
  return distillVoiceProfile({
    voiceSamples: profile.voice_samples,
    voiceNotes: profile.voice_notes,
    recentDraftBodies: drafts.map((d) => d.body),
    apiKey,
  });
}
