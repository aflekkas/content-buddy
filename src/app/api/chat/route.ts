import {
  convertToModelMessages,
  streamText,
  generateText,
  stepCountIs,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildSystemMessages } from "@/lib/anthropic";
import { getModel } from "@/lib/model-dispatch";
import {
  addChatUsage,
  addUserFact,
  appendMessage,
  createVideo,
  getActiveModel,
  getChat,
  getDecryptedProviderKey,
  getUserProfile,
  listUserFacts,
  setChatTitle,
  updateVideo,
} from "@/lib/db/queries";

export const maxDuration = 60;

type ChatRequestBody = {
  id: string;
  messages: UIMessage[];
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: chatId, messages }: ChatRequestBody = await req.json();

  const chat = await getChat(chatId, user.id);
  if (!chat) {
    return NextResponse.json({ error: "chat_not_found" }, { status: 404 });
  }

  const { provider, model } = await getActiveModel(user.id);
  const apiKey = await getDecryptedProviderKey(user.id, provider);
  if (!apiKey) {
    return NextResponse.json(
      { error: "missing_key", provider },
      { status: 402 },
    );
  }

  const [profile, facts] = await Promise.all([
    getUserProfile(user.id),
    listUserFacts(user.id),
  ]);

  const lastMessage = messages[messages.length - 1];
  if (lastMessage?.role === "user") {
    const text = extractText(lastMessage);
    if (text) {
      await appendMessage(chatId, "user", text);
      if (!chat.title) {
        void generateChatTitle(chatId, text, provider, model, apiKey);
      }
    }
  }

  const modelMessages = await convertToModelMessages(messages);
  const knownFacts = new Set(facts.map((f) => f.content.toLowerCase().trim()));
  const userId = user.id;

  const result = streamText({
    model: getModel(provider, model, apiKey),
    messages: [
      ...buildSystemMessages({
        bio: profile?.bio ?? "",
        facts: facts.map((f) => f.content),
        profile: profile
          ? {
              platforms: profile.platforms ?? [],
              niche_primary: profile.niche_primary ?? null,
              niche_secondary: profile.niche_secondary ?? [],
              channel_pitch: profile.channel_pitch ?? null,
              audience_stage: profile.audience_stage ?? null,
              primary_goal: profile.primary_goal ?? null,
            }
          : null,
      }),
      ...modelMessages,
    ],
    stopWhen: stepCountIs(5),
    tools: {
      remember_user_fact: tool({
        description:
          "Store a stable fact about the creator (niche, platforms, audience, goals, constraints, brand voice) for future conversations. Do not use for ephemeral state.",
        inputSchema: z.object({
          fact: z
            .string()
            .min(3)
            .max(300)
            .describe(
              "A single fact about the creator, phrased in third person (e.g., 'creator is a fitness coach targeting busy parents').",
            ),
        }),
        execute: async ({ fact }) => {
          const normalized = fact.toLowerCase().trim();
          if (knownFacts.has(normalized)) {
            return { saved: false, reason: "duplicate" };
          }
          await addUserFact(userId, fact.trim());
          knownFacts.add(normalized);
          return { saved: true };
        },
      }),
      create_video: tool({
        description:
          "Create a saved video idea when the conversation lands on a concrete concept, hook, or draft script.",
        inputSchema: z.object({
          title: z.string().min(3).max(120),
          hook: z.string().max(500).optional(),
          script: z.string().max(4000).optional(),
        }),
        execute: async ({ title, hook, script }) => {
          const video = await createVideo(userId, {
            chatId,
            title: title.trim(),
            hook: hook?.trim(),
            script: script?.trim(),
          });

          return {
            id: video.id,
            title: video.title,
            status: video.status,
          };
        },
      }),
      update_video: tool({
        description:
          "Update an existing saved video with refined title, hook, script, or status.",
        inputSchema: z.object({
          id: z.string().uuid(),
          title: z.string().min(3).max(120).optional(),
          hook: z.string().max(500).optional(),
          script: z.string().max(4000).optional(),
          status: z.enum(["idea", "ready", "filmed"]).optional(),
        }),
        execute: async ({ id, ...patch }) => {
          const video = await updateVideo(userId, id, {
            title: patch.title?.trim(),
            hook: patch.hook?.trim(),
            script: patch.script?.trim(),
            status: patch.status,
          });

          return video ?? { error: "not_found" as const };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    messageMetadata: ({ part }) => {
      if (part.type === "finish") {
        const u = part.totalUsage;
        return {
          usage: {
            inputTokens: u.inputTokens ?? 0,
            outputTokens: u.outputTokens ?? 0,
            cacheReadTokens: u.inputTokenDetails?.cacheReadTokens ?? 0,
            cacheCreationTokens: u.inputTokenDetails?.cacheWriteTokens ?? 0,
          },
        };
      }
    },
    onFinish: async ({ messages: finalMessages }) => {
      const assistantMsg = finalMessages[finalMessages.length - 1];
      if (assistantMsg?.role === "assistant") {
        const text = extractText(assistantMsg);
        if (text) {
          await appendMessage(chatId, "assistant", text);
        }
      }
      try {
        const total = await result.totalUsage;
        const nonCacheInput = total.inputTokenDetails?.noCacheTokens;
        await addChatUsage(chatId, {
          inputTokens:
            nonCacheInput ?? Math.max(0, total.inputTokens ?? 0),
          outputTokens: total.outputTokens ?? 0,
          cacheReadTokens: total.inputTokenDetails?.cacheReadTokens ?? 0,
          cacheCreationTokens: total.inputTokenDetails?.cacheWriteTokens ?? 0,
        });
      } catch {
        // usage tracking is best-effort; don't fail the response
      }
    },
  });
}

function extractText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("")
    .trim();
}

async function generateChatTitle(
  chatId: string,
  firstUserMessage: string,
  provider: Parameters<typeof getModel>[0],
  model: string,
  apiKey: string,
) {
  try {
    const { text } = await generateText({
      model: getModel(provider, model, apiKey),
      messages: [
        {
          role: "system",
          content:
            "Write a 3-6 word title for a chat whose first message is shown. No quotes, no punctuation at the end, sentence case.",
        },
        { role: "user", content: firstUserMessage.slice(0, 500) },
      ],
    });
    const title = text.trim().replace(/^["']|["']$/g, "").slice(0, 80);
    if (title) {
      await setChatTitle(chatId, title);
    }
  } catch {
    const fallback = firstUserMessage.slice(0, 40).trim();
    if (fallback) {
      await setChatTitle(chatId, fallback);
    }
  }
}
