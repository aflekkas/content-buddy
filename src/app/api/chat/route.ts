import {
  convertToModelMessages,
  streamText,
  generateText,
  stepCountIs,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import {
  errorResponse,
  notFound,
  requireAuth,
  requireProviderKey,
} from "@/lib/api";
import { buildSystemMessages } from "@/lib/anthropic";
import { getModel } from "@/lib/model-dispatch";
import { providerSupportsImages } from "@/lib/providers";
import {
  addChatUsage,
  appendMemoryFile,
  appendMessageWithParts,
  createHook,
  createVideo,
  ensureStarterMemoryFiles,
  getMemoryFileByPath,
  getActiveModel,
  getChat,
  getUserProfile,
  setChatTitleIfEmpty,
  summarizeMemoryFiles,
  updateVideo,
  upsertMemoryFile,
} from "@/lib/db/queries";
import { MAX_MEMORY_CONTENT_LENGTH } from "@/lib/memory";
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

  const memoryFiles = await ensureStarterMemoryFiles(user.id);
  const autoloadMemoryFiles = memoryFiles.filter((file) => file.autoload);
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
  const userId = user.id;

  const result = streamText({
    model: getModel(provider, model, apiKey),
    messages: [
      ...buildSystemMessages({
        memoryFiles: autoloadMemoryFiles,
        assistantName: profile?.assistant_name ?? null,
        assistantPersona: profile?.assistant_persona ?? null,
      }),
      ...modelMessages,
    ],
    stopWhen: stepCountIs(5),
    tools: {
      list_memory_files: tool({
        description:
          "List the creator's markdown memory files so you can decide what deeper context to read or update.",
        inputSchema: z.object({}),
        execute: async () => {
          const files = await ensureStarterMemoryFiles(userId);
          return { files: summarizeMemoryFiles(files) };
        },
      }),
      read_memory_file: tool({
        description:
          "Read a markdown memory file by exact path, for example identity.md, facts.md, or facts/audience.md.",
        inputSchema: z.object({
          path: z
            .string()
            .min(1)
            .max(180)
            .describe("The exact markdown memory path to read."),
        }),
        execute: async ({ path }) => {
          const file =
            (await getMemoryFileByPath(userId, path)) ??
            (await ensureStarterMemoryFiles(userId)).find(
              (memoryFile) => memoryFile.path === path,
            );
          if (!file) {
            return { error: "not_found" as const };
          }
          return {
            path: file.path,
            title: file.title,
            content: file.content,
            autoload: file.autoload,
            updated_at: file.updated_at,
          };
        },
      }),
      upsert_memory_file: tool({
        description:
          "Create or replace a markdown memory file. Use for stable creator context. Organize detailed learned facts under facts/ and keep facts.md as an index.",
        inputSchema: z.object({
          path: z.string().min(1).max(180),
          title: z.string().max(120).optional(),
          content: z.string().min(1).max(MAX_MEMORY_CONTENT_LENGTH),
          autoload: z.boolean().optional(),
        }),
        execute: async ({ path, title, content, autoload }) => {
          try {
            const file = await upsertMemoryFile(userId, {
              path,
              title,
              content: content.trim(),
              autoload,
              source: "agent",
            });
            return {
              path: file.path,
              title: file.title,
              autoload: file.autoload,
              updated_at: file.updated_at,
            };
          } catch {
            return { error: "memory_unavailable" as const, path };
          }
        },
      }),
      append_memory_file: tool({
        description:
          "Append markdown to an existing memory file, or create it if missing. Use this for adding one stable fact or a short section without rewriting the whole file.",
        inputSchema: z.object({
          path: z.string().min(1).max(180),
          content: z.string().min(1).max(4000),
          autoload: z.boolean().optional(),
        }),
        execute: async ({ path, content, autoload }) => {
          try {
            const file = await appendMemoryFile(userId, {
              path,
              content: content.trim(),
              autoload,
              source: "agent",
            });
            return {
              path: file.path,
              title: file.title,
              autoload: file.autoload,
              updated_at: file.updated_at,
            };
          } catch {
            return { error: "memory_unavailable" as const, path };
          }
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
            hook: video.hook,
            status: video.status,
            chat_id: video.chat_id,
            updated_at: video.updated_at,
          };
        },
      }),
      save_hook: tool({
        description:
          "Save a reusable opening line / hook to the creator's swipe file. Use when the conversation lands on a punchy hook the creator may want to reuse beyond a single video.",
        inputSchema: z.object({
          text: z
            .string()
            .min(10)
            .max(500)
            .describe("The hook line itself. 10-500 characters."),
          notes: z
            .string()
            .max(1000)
            .optional()
            .describe("Optional context, why it works, or a usage tip."),
          tags: z
            .array(z.string().min(1).max(40))
            .max(10)
            .optional()
            .describe("Optional short tags such as 'curiosity', 'list', 'contrarian'."),
        }),
        execute: async ({ text, notes, tags }) => {
          const hook = await createHook(userId, {
            text: text.trim(),
            notes: notes?.trim(),
            tags: tags?.map((t) => t.trim()).filter(Boolean),
            source: "chat",
            sourceChatId: chatId,
          });
          return {
            id: hook.id,
            text: hook.text,
            tags: hook.tags,
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

          if (!video) return { error: "not_found" as const };
          return {
            id: video.id,
            title: video.title,
            hook: video.hook,
            status: video.status,
            chat_id: video.chat_id,
            updated_at: video.updated_at,
          };
        },
      }),
    },
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
          await appendMessageWithParts(
            chatId,
            "assistant",
            persistableParts,
          );
          revalidateTag(`chat:${chatId}:messages`, "max");
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
