import {
  convertToModelMessages,
  generateText,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { errorResponse, notFound, requireAuth } from "@/lib/api";
import { buildSystemMessages } from "@/lib/system-prompt";
import { getModel } from "@/lib/model-dispatch";
import { providerSupportsImages } from "@/lib/providers";
import {
  addChatUsage,
  appendMessageWithParts,
  getChat,
  getDraft,
  getUserProfile,
  getSignal,
  listSignalsByIds,
  listSources,
  setChatTitleIfEmpty,
  updateDraft,
} from "@/lib/db/queries";
import { extractText, filterPersistableParts } from "@/lib/message-parts";
import { encodeProviderError, mapProviderError } from "@/lib/provider-errors";
import { buildRateLimitHeaders, checkChatRateLimit } from "@/lib/rate-limit";
import type { SignalRow } from "@/lib/db/types";

export const maxDuration = 60;

type ChatRequestBody = {
  id: string;
  messages: UIMessage[];
  activeDraftId?: string;
};

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const rateLimit = await checkChatRateLimit();
  const rateLimitHeaders = buildRateLimitHeaders(rateLimit);
  if (!rateLimit.allowed) {
    return errorResponse(
      "rate_limited",
      429,
      { retryAfter: rateLimit.retryAfter },
      { headers: rateLimitHeaders },
    );
  }

  const { id: chatId, messages, activeDraftId }: ChatRequestBody =
    await req.json();
  if (!activeDraftId) {
    return errorResponse("missing_active_draft", 400);
  }

  const chat = await getChat(chatId, user.id);
  if (!chat) return notFound();

  const draft = await getDraft(user.id, activeDraftId);
  if (!draft) return notFound();
  if (draft.chat_id && draft.chat_id !== chat.id) return notFound();
  if (!draft.chat_id) {
    await updateDraft(user.id, draft.id, { chat_id: chat.id });
  }

  const provider = "openai" as const;
  const model = "gpt-4o-mini";
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return errorResponse("missing_openai_key_env", 500, {
      message: "Set OPENAI_API_KEY in .env.local",
    });
  }

  const hasFileParts = messages.some((m) =>
    m.parts.some((p) => p.type === "file"),
  );
  if (hasFileParts && !providerSupportsImages(provider)) {
    return errorResponse("image_not_supported", 415, { provider });
  }

  const [profile, draftSignals, sources] = await Promise.all([
    getUserProfile(user.id),
    listSignalsByIds(user.id, draft.signal_ids),
    listSources(user.id),
  ]);
  const sourceHandles = new Map(
    sources.map((source) => [source.id, source.handle]),
  );
  const lastMessage = messages[messages.length - 1];
  if (lastMessage?.role === "user") {
    const persistableParts = filterPersistableParts(lastMessage.parts);
    if (persistableParts.length > 0) {
      await appendMessageWithParts(chatId, "user", persistableParts);
      revalidateTag(`chat:${chatId}:messages`, "max");
      const text = extractText(lastMessage);
      if (text && !chat.title) {
        generateChatTitle(chatId, text, provider, model, apiKey).catch((err) =>
          console.error("[chat] title generation failed", err),
        );
      }
    }
  }

  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: getModel(provider, model, apiKey),
    messages: [
      ...buildSystemMessages({
        creatorProfile: profile
          ? {
              niche: profile.niche,
              voice_notes: profile.voice_notes,
            }
          : null,
        activeDraft: draft,
        activeDraftSignals: draftSignals.map((signal) => ({
          ...signal,
          sourceHandle: sourceHandles.get(signal.source_id) ?? null,
        })),
      }),
      ...modelMessages,
    ],
    tools: {
      update_draft: tool({
        description: "Replace the active draft body with the edited body.",
        inputSchema: z.object({
          body: z.string().min(1).max(20000),
        }),
        execute: async ({ body }) => {
          await updateDraft(user.id, activeDraftId, { body });
          return { ok: true };
        },
      }),
      read_signal: tool({
        description: "Read a source signal linked to or owned by this user.",
        inputSchema: z.object({
          signalId: z.uuid(),
        }),
        execute: async ({ signalId }) => {
          const signal = await getSignal(user.id, signalId);
          if (!signal) return { ok: false, error: "not_found" };
          const handle = sourceHandles.get(signal.source_id) ?? null;
          return {
            ok: true,
            signal: {
              id: signal.id,
              source: handle ? normalizeHandle(handle) : null,
              text: readSignalText(signal),
              url: signal.url,
              posted_at: signal.posted_at,
              summary: signal.summary,
              relevance_score: signal.relevance_score,
            },
          };
        },
      }),
    },
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse({
    headers: rateLimitHeaders,
    originalMessages: messages,
    onError: (error) => {
      console.error("[chat] streamText error", error);
      const payload = mapProviderError(provider, model, error);
      return encodeProviderError(payload);
    },
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
        const persistableParts = filterPersistableParts(assistantMsg.parts);
        if (persistableParts.length > 0) {
          await appendMessageWithParts(chatId, "assistant", persistableParts);
          revalidateTag(`chat:${chatId}:messages`, "max");
        }
      }
      try {
        const total = await result.totalUsage;
        const nonCacheInput = total.inputTokenDetails?.noCacheTokens;
        await addChatUsage(chatId, {
          inputTokens: nonCacheInput ?? Math.max(0, total.inputTokens ?? 0),
          outputTokens: total.outputTokens ?? 0,
          cacheReadTokens: total.inputTokenDetails?.cacheReadTokens ?? 0,
          cacheCreationTokens: total.inputTokenDetails?.cacheWriteTokens ?? 0,
        });
      } catch (err) {
        console.error("[chat] addChatUsage failed", err);
      }
    },
  });
}

function normalizeHandle(handle: string) {
  return handle.startsWith("@") ? handle : `@${handle}`;
}

function readSignalText(signal: SignalRow) {
  const rawText = signal.raw.text;
  if (typeof rawText === "string" && rawText.trim()) return rawText.trim();
  if (signal.summary?.trim()) return signal.summary.trim();
  return signal.url;
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
      await setChatTitleIfEmpty(chatId, title);
    }
  } catch {
    const fallback = firstUserMessage.slice(0, 40).trim();
    if (fallback) {
      await setChatTitleIfEmpty(chatId, fallback);
    }
  }
}
