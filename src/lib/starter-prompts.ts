import { generateText } from "ai";
import { buildCreatorProfileBlock } from "@/lib/anthropic";
import type { StarterPromptContext } from "@/lib/db/queries";
import type { StarterPrompt, StarterPromptIcon } from "@/lib/db/types";
import { getModel } from "@/lib/model-dispatch";
import type { ProviderId } from "@/lib/providers";

export const FALLBACK_STARTER_PROMPTS: StarterPrompt[] = [
  {
    text: "Help me turn a recent client win into a short video idea",
    icon: "target",
  },
  {
    text: "Give me a sharper take for my niche that will start a conversation",
    icon: "flame",
  },
  {
    text: "I need a simple video I can film today with almost no setup",
    icon: "video",
  },
  {
    text: "Turn something my audience struggles with into a strong hook",
    icon: "users",
  },
  {
    text: "Help me pick a content angle based on what I should be known for",
    icon: "lightbulb",
  },
  {
    text: "Give me a video idea that teaches without sounding generic",
    icon: "sparkles",
  },
];

const PROMPT_SYSTEM = `You generate empty-state starter prompts for Shortform Studio, a short-form video planning app.

Return only JSON in this shape:
{"prompts":[{"text":"...","icon":"target"},{"text":"...","icon":"lightbulb"}]}

Rules:
- Write exactly 6 prompts.
- Each prompt must be 55-120 characters.
- Pick one relevant icon per prompt from: target, lightbulb, flame, users, message, video, sparkles, zap.
- Make them varied: goal, niche/audience, pain point, contrarian take, memory/recent work, and script/video help.
- Use first person as if the creator is clicking the prompt.
- Be concrete enough that an AI can immediately recommend a specific short-form video.
- Do not mention API keys, memory files, the prompt system, or internal data.
- Do not use markdown.`;

export async function generateStarterPrompts({
  provider,
  model,
  apiKey,
  context,
}: {
  provider: ProviderId;
  model: string;
  apiKey: string;
  context: StarterPromptContext;
}): Promise<StarterPrompt[]> {
  const result = await generateText({
    model: getModel(provider, model, apiKey),
    messages: [
      { role: "system", content: PROMPT_SYSTEM },
      { role: "user", content: buildPromptContext(context) },
    ],
  });

  return normalizePrompts(parsePrompts(result.text));
}

function buildPromptContext(context: StarterPromptContext): string {
  const profile = context.profile
    ? buildCreatorProfileBlock({
        platforms: context.profile.platforms ?? [],
        niche_primary: context.profile.niche_primary,
        niche_secondary: context.profile.niche_secondary ?? [],
        channel_pitch: context.profile.channel_pitch,
        audience_stage: context.profile.audience_stage,
        primary_goal: context.profile.primary_goal,
      })
    : "<creator_profile />";

  const memory = context.memoryFiles
    .map(
      (file) =>
        `<memory_file path="${file.path}" title="${file.title}">\n${file.content.slice(0, 1600).trim()}\n</memory_file>`,
    )
    .join("\n\n");

  const recent = context.recentMessages
    .slice(0, 10)
    .map((message) => `- ${message.slice(0, 240)}`)
    .join("\n");

  return [
    profile,
    memory ? `<autoloaded_memory>\n${memory}\n</autoloaded_memory>` : "",
    recent ? `<recent_user_messages>\n${recent}\n</recent_user_messages>` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function parsePrompts(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

const PROMPT_ICONS: ReadonlySet<StarterPromptIcon> = new Set([
  "target",
  "lightbulb",
  "flame",
  "users",
  "message",
  "video",
  "sparkles",
  "zap",
]);

function normalizePrompts(raw: unknown): StarterPrompt[] {
  const prompts =
    raw && typeof raw === "object" && "prompts" in raw
      ? (raw as { prompts?: unknown }).prompts
      : raw;

  if (!Array.isArray(prompts)) return FALLBACK_STARTER_PROMPTS;

  const seen = new Set<string>();
  const cleaned: StarterPrompt[] = [];
  for (const prompt of prompts) {
    const normalized = normalizePrompt(prompt);
    if (!normalized || seen.has(normalized.text)) continue;
    seen.add(normalized.text);
    cleaned.push(normalized);
  }

  return [...cleaned, ...FALLBACK_STARTER_PROMPTS].slice(0, 6);
}

function normalizePrompt(prompt: unknown): StarterPrompt | null {
  if (typeof prompt === "string") {
    const text = cleanText(prompt);
    return text ? { text, icon: "sparkles" } : null;
  }

  if (!prompt || typeof prompt !== "object") return null;
  const maybe = prompt as { text?: unknown; icon?: unknown };
  const text = cleanText(String(maybe.text ?? ""));
  if (!text) return null;

  const icon = PROMPT_ICONS.has(maybe.icon as StarterPromptIcon)
    ? (maybe.icon as StarterPromptIcon)
    : "sparkles";

  return { text, icon };
}

function cleanText(text: string): string {
  return text
    .replace(/^[-*\d.]+\s*/, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
}
