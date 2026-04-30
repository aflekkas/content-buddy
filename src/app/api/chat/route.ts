import {
  convertToModelMessages,
  generateText,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { revalidateTag } from "next/cache";
import {
  errorResponse,
  notFound,
  requireAuth,
  requireProviderKey,
} from "@/lib/api";
import { buildSystemMessages } from "@/lib/system-prompt";
import { getModel } from "@/lib/model-dispatch";
import { providerSupportsImages } from "@/lib/providers";
import {
  addChatUsage,
  appendMessageWithParts,
  getActiveModel,
  getChat,
  getUserProfile,
  setChatTitleIfEmpty,
} from "@/lib/db/queries";
import { extractText, filterPersistableParts } from "@/lib/message-parts";
import { encodeProviderError, mapProviderError } from "@/lib/provider-errors";
import { buildRateLimitHeaders, checkChatRateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

type ChatRequestBody = {
  id: string;
  messages: UIMessage[];
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

  const { id: chatId, messages }: ChatRequestBody = await req.json();

  const chat = await getChat(chatId, user.id);
  if (!chat) return notFound();

  const { provider, model } = await getActiveModel(user.id);
  const keyResult = await requireProviderKey(user.id, provider);
  if (!keyResult.ok) return keyResult.response;
  const { apiKey } = keyResult;

  const hasFileParts = messages.some((m) =>
    m.parts.some((p) => p.type === "file"),
  );
  if (hasFileParts && !providerSupportsImages(provider)) {
    return errorResponse("image_not_supported", 415, { provider });
  }

  const profile = await getUserProfile(user.id);
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
      }),
      ...modelMessages,
    ],
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
