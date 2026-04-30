import { generateText } from "ai";
import { z } from "zod";
import { getDecryptedProviderKey } from "@/lib/db/queries";
import type { SignalRow } from "@/lib/db/types";
import { getModel } from "@/lib/model-dispatch";

const RelevanceSchema = z.object({
  score: z.number().min(0).max(1),
  summary: z.string().min(1).max(240),
});

async function getOpenAIModel(userId: string) {
  const apiKey = await getDecryptedProviderKey(userId, "openai");
  if (!apiKey) {
    throw new Error("missing_openai_key");
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

export async function scoreRelevance(args: {
  userId: string;
  signalText: string;
  niche: string | null;
  voiceNotes: string | null;
}): Promise<{ score: number; summary: string }> {
  const model = await getOpenAIModel(args.userId);
  const { text } = await generateText({
    model,
    messages: [
      {
        role: "system",
        content: `You score how relevant a tweet is to a creator's LinkedIn audience. Niche: ${profileLine(args.niche)}. Voice: ${profileLine(args.voiceNotes)}. Return JSON {score: 0..1, summary: 1-line}.`,
      },
      { role: "user", content: args.signalText.slice(0, 4000) },
    ],
  });

  const parsed = RelevanceSchema.parse(extractJson(text));
  return { score: parsed.score, summary: parsed.summary };
}

export async function synthesizeFromSignals(args: {
  userId: string;
  signals: SignalRow[];
  niche: string | null;
  voiceNotes: string | null;
}): Promise<{ body: string }> {
  if (args.signals.length === 0) {
    throw new Error("signals required");
  }

  const model = await getOpenAIModel(args.userId);
  const sources = args.signals
    .map(
      (signal, index) =>
        `Source ${index + 1} (${signal.url}, ${signal.posted_at}):\n${signalText(signal)}`,
    )
    .join("\n\n");

  const { text } = await generateText({
    model,
    messages: [
      {
        role: "system",
        content: `You are a LinkedIn ghostwriter. Niche: ${profileLine(args.niche)}. Voice: ${profileLine(args.voiceNotes)}. Turn the source X posts into a single LinkedIn long-form post in their voice, ~1500 chars.`,
      },
      { role: "user", content: sources.slice(0, 12000) },
    ],
  });

  return { body: text.trim() };
}
