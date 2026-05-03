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
  createDraft,
  createFact,
  getChat,
  getDraft,
  getUserProfile,
  getSignal,
  listFacts,
  listSignals,
  listSignalsByIds,
  listSources,
  setChatTitleIfEmpty,
  updateDraft,
  updateFact,
  updateSignal,
} from "@/lib/db/queries";
import { extractText, filterPersistableParts } from "@/lib/message-parts";
import { encodeProviderError, mapProviderError } from "@/lib/provider-errors";
import { buildRateLimitHeaders, checkChatRateLimit } from "@/lib/rate-limit";
import { synthesizeFromSignals } from "@/lib/synthesis";
import type { SignalRow } from "@/lib/db/types";

export const maxDuration = 60;

type ChatRequestBody = {
  id: string;
  messages: UIMessage[];
  activeDraftId?: string;
};

const NEWS_SCAN_LOOKBACK_DAYS = 14;

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

  const chat = await getChat(chatId, user.id);
  if (!chat) return notFound();

  const draft = activeDraftId ? await getDraft(user.id, activeDraftId) : null;
  if (activeDraftId) {
    if (!draft) return notFound();
    if (draft.chat_id && draft.chat_id !== chat.id) return notFound();
    if (!draft.chat_id) {
      await updateDraft(user.id, draft.id, { chat_id: chat.id });
    }
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

  const [profile, facts, draftSignals, sources] = await Promise.all([
    getUserProfile(user.id),
    listFacts(user.id),
    draft ? listSignalsByIds(user.id, draft.signal_ids) : Promise.resolve([]),
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
        facts,
        activeDraft: draft,
        activeDraftSignals: draftSignals.map((signal) => ({
          ...signal,
          sourceHandle: sourceHandles.get(signal.source_id) ?? null,
        })),
      }),
      ...modelMessages,
    ],
    tools: {
      read_memory: tool({
        description:
          "Return all of the user's saved long-term memory facts. Call this if you want a fresh read of memory; current memory is already in the system prompt.",
        inputSchema: z.object({}),
        execute: async () => {
          const rows = await listFacts(user.id);
          return {
            ok: true,
            facts: rows.map((r) => ({ id: r.id, fact: r.fact, source: r.source })),
          };
        },
      }),
      write_memory: tool({
        description:
          "Save a new long-term memory fact about the user (niche, voice, audience, preferences). Before calling, check the <memory> block for duplicates or overlap; if the new info refines an existing fact, call update_memory instead.",
        inputSchema: z.object({
          fact: z.string().min(1).max(500),
        }),
        execute: async ({ fact }) => {
          const row = await createFact(user.id, fact, "agent");
          return { ok: true, id: row.id };
        },
      }),
      update_memory: tool({
        description:
          "Update an existing memory fact by id. Use when a previously saved fact needs refinement, correction, or merging with new info. Get ids from the <memory> block.",
        inputSchema: z.object({
          id: z.uuid(),
          fact: z.string().min(1).max(500),
        }),
        execute: async ({ id, fact }) => {
          try {
            const row = await updateFact(user.id, id, fact);
            return { ok: true, id: row.id };
          } catch {
            return { ok: false, error: "update_failed" };
          }
        },
      }),
      news_scan: tool({
        description:
          "Pull recent items from the user's RSS feeds. Returns top relevance-scored signals from the last 14 days. Use when the user asks about news, signals, recent events, or wants to draft from current items.",
        inputSchema: z.object({
          limit: z.number().int().min(1).max(20).optional(),
        }),
        execute: async ({ limit }) => {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - NEWS_SCAN_LOOKBACK_DAYS);
          const rows = await listSignals(user.id, {
            limit: 200,
            postedAfter: cutoff.toISOString(),
          });
          const top = rows
            .filter((s) => s.status !== "dismissed")
            .sort(
              (a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0),
            )
            .slice(0, limit ?? 5);
          return {
            ok: true,
            signals: top.map((s) => ({
              id: s.id,
              source: sourceHandles.get(s.source_id) ?? null,
              text: readSignalText(s),
              url: s.url,
              posted_at: s.posted_at,
              summary: s.summary,
              relevance_score: s.relevance_score,
            })),
          };
        },
      }),
      save_as_draft: tool({
        description:
          "Save a finalized LinkedIn post body as a draft. Use when the user is happy with a post and wants to keep it.",
        inputSchema: z.object({
          body: z.string().min(1).max(20000),
          signal_ids: z.array(z.uuid()).optional(),
        }),
        execute: async ({ body, signal_ids }) => {
          const row = await createDraft(user.id, {
            body,
            signal_ids: signal_ids ?? [],
            chat_id: chat.id,
          });
          if (signal_ids && signal_ids.length > 0) {
            await Promise.all(
              signal_ids.map((id) =>
                updateSignal(user.id, id, { status: "drafted" }),
              ),
            );
          }
          return { ok: true, id: row.id };
        },
      }),
      synthesize_from_news: tool({
        description:
          "Generate a LinkedIn draft from recent news signals using the user's niche and voice. Returns the draft body. The user can then ask you to save it.",
        inputSchema: z.object({
          signal_ids: z.array(z.uuid()).min(1).max(5),
        }),
        execute: async ({ signal_ids }) => {
          const signals = await listSignalsByIds(user.id, signal_ids);
          if (signals.length === 0) {
            return { ok: false, error: "no_signals_found" };
          }
          try {
            const { body } = await synthesizeFromSignals({
              mode: "news",
              signals,
              niche: profile?.niche ?? null,
              voiceNotes: profile?.voice_notes ?? null,
              voiceSamples: profile?.voice_samples ?? null,
            });
            return { ok: true, body, signal_ids };
          } catch (error) {
            return {
              ok: false,
              error:
                error instanceof Error ? error.message : "synthesis_failed",
            };
          }
        },
      }),
      update_draft: tool({
        description:
          "Replace the active draft body with the edited body. Only works when an active draft is in scope.",
        inputSchema: z.object({
          body: z.string().min(1).max(20000),
        }),
        execute: async ({ body }) => {
          if (!activeDraftId) return { ok: false, error: "no_active_draft" };
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
    stopWhen: stepCountIs(8),
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
