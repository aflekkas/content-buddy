import { generateText } from "ai";
import { z } from "zod";
import type { SignalRow } from "@/lib/db/types";
import { getModel } from "@/lib/model-dispatch";

const RelevanceSchema = z.object({
  score: z.number().min(0).max(1),
  summary: z.string().min(1).max(240),
});

export type SynthMode = "news";

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
  return `Here are examples of how the user writes on LinkedIn. Match this voice closely:\n\n${trimmed.slice(0, 6000)}`;
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

const SYSTEM_PROMPTS: Record<SynthMode, string> = {
  news: "You are a LinkedIn ghostwriter. Riff on these industry items in the operator's voice. Dry, confident, no hype. Lead with a sharp take, anchor with a concrete detail from the source. Around 1500 chars.",
};

export async function synthesizeFromSignals(args: {
  mode?: SynthMode;
  signals: SignalRow[];
  niche: string | null;
  voiceNotes: string | null;
  voiceSamples?: string | null;
}): Promise<{ body: string }> {
  if (args.signals.length === 0) {
    throw new Error("signals required");
  }

  const mode: SynthMode = args.mode ?? "news";
  const model = getOpenAIModel();
  const sources = args.signals
    .map(
      (signal, index) =>
        `Source ${index + 1} (${signal.url}, ${signal.posted_at}):\n${signalText(signal)}`,
    )
    .join("\n\n");

  const samples = voiceFewShots(args.voiceSamples ?? null);

  const messages: Array<{ role: "system" | "user"; content: string }> = [
    {
      role: "system",
      content: `${SYSTEM_PROMPTS[mode]} Niche: ${profileLine(args.niche)}. Voice notes: ${profileLine(args.voiceNotes)}.`,
    },
  ];
  if (samples) {
    messages.push({ role: "user", content: samples });
  }
  messages.push({ role: "user", content: sources.slice(0, 12000) });

  const { text } = await generateText({ model, messages });

  return { body: text.trim() };
}
