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
import {
  defaultModel,
  isModelForProvider,
  isProviderId,
  providerSupportsImages,
} from "@/lib/providers";
import {
  addChatUsage,
  appendMessageWithParts,
  createDraft,
  createMemory,
  createSource,
  deleteSource,
  getChat,
  getDraft,
  getUserProfile,
  getSignal,
  listMemories,
  listRecentDrafts,
  listSignals,
  listSignalsByIds,
  listSources,
  setChatTitleIfEmpty,
  updateDraft,
  updateMemory,
  updateSignal,
  updateSource,
  upsertUserProfile,
} from "@/lib/db/queries";
import { ProfileSettingsBody, SETTINGS_FIELDS } from "@/lib/settings-schema";
import { probeFeed } from "@/lib/sources/rss";
import { NICHE_BUNDLES } from "@/lib/sources/niche-bundles";
import { extractText, filterPersistableParts } from "@/lib/message-parts";
import { encodeProviderError, mapProviderError } from "@/lib/provider-errors";
import { buildRateLimitHeaders, checkChatRateLimit } from "@/lib/rate-limit";
import { synthesizeFromSignals } from "@/lib/synthesis";
import { POST_TYPES, type PostType, type SignalRow } from "@/lib/db/types";

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

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return errorResponse("missing_openai_key_env", 500, {
      message: "Set OPENAI_API_KEY in .env.local",
    });
  }

  const [profile, memories, draftSignals, sources] = await Promise.all([
    getUserProfile(user.id),
    listMemories(user.id),
    draft ? listSignalsByIds(user.id, draft.signal_ids) : Promise.resolve([]),
    listSources(user.id),
  ]);

  const provider =
    profile && isProviderId(profile.active_provider_id)
      ? profile.active_provider_id
      : ("openai" as const);
  const model =
    profile && isModelForProvider(provider, profile.active_model_id)
      ? profile.active_model_id
      : defaultModel(provider);

  const hasFileParts = messages.some((m) =>
    m.parts.some((p) => p.type === "file"),
  );
  if (hasFileParts && !providerSupportsImages(provider)) {
    return errorResponse("image_not_supported", 415, { provider });
  }
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
        profile,
        memories,
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
          "Return all of the user's saved long-term memories. Call this if you want a fresh read of memory; current memory is already in the system prompt.",
        inputSchema: z.object({}),
        execute: async () => {
          const rows = await listMemories(user.id);
          return {
            ok: true,
            memories: rows.map((r) => ({
              id: r.id,
              memory: r.memory,
              source: r.source,
            })),
          };
        },
      }),
      write_memory: tool({
        description:
          "Save a new long-term memory about the user (niche, voice, audience, preferences, quirks, dislikes). Before calling, check the <memory> block for duplicates or overlap; if the new info refines an existing memory, call update_memory instead.",
        inputSchema: z.object({
          memory: z.string().min(1).max(500),
        }),
        execute: async ({ memory }) => {
          const row = await createMemory(user.id, memory, "agent");
          return { ok: true, id: row.id };
        },
      }),
      update_memory: tool({
        description:
          "Update an existing memory by id. Use when a previously saved memory needs refinement, correction, or merging with new info. Get ids from the <memory> block.",
        inputSchema: z.object({
          id: z.uuid(),
          memory: z.string().min(1).max(500),
        }),
        execute: async ({ id, memory }) => {
          try {
            const row = await updateMemory(user.id, id, memory);
            return { ok: true, id: row.id };
          } catch {
            return { ok: false, error: "update_failed" };
          }
        },
      }),
      read_settings: tool({
        description:
          "Return the user's current writing settings. Current values are already injected via <writing_style> and <audience>; call only to re-confirm after an update_settings.",
        inputSchema: z.object({}),
        execute: async () => {
          const p = await getUserProfile(user.id);
          if (!p) return { ok: true, settings: null };
          const settings = Object.fromEntries(
            SETTINGS_FIELDS.map((k) => [k, p[k] ?? null]),
          );
          return { ok: true, settings };
        },
      }),
      update_settings: tool({
        description:
          "Update one or more structured writing settings: target_audience, post_goal, formality (1-5), elaboration (1-3), length_pref (200-5000 chars), preferred_post_types, avoid_phrases, include_links, niche, voice_notes, voice_samples. Pass only fields that change. Do NOT use for freeform durable facts — that's write_memory. After calling, briefly tell the user what changed in one sentence.",
        inputSchema: ProfileSettingsBody,
        execute: async (patch) => {
          const parsed = ProfileSettingsBody.safeParse(patch);
          if (!parsed.success) {
            return {
              ok: false,
              error: "validation_failed",
              issues: parsed.error.issues,
            };
          }
          const before = await getUserProfile(user.id);
          try {
            const updated = await upsertUserProfile(user.id, parsed.data);
            const changed = SETTINGS_FIELDS.filter((k) => {
              if (!(k in parsed.data)) return false;
              const prev = before?.[k] ?? null;
              const next = updated[k] ?? null;
              return JSON.stringify(prev) !== JSON.stringify(next);
            });
            const settings = Object.fromEntries(
              SETTINGS_FIELDS.map((k) => [k, updated[k] ?? null]),
            );
            return { ok: true, changed, settings };
          } catch (err) {
            return {
              ok: false,
              error: "update_failed",
              message: err instanceof Error ? err.message : "update failed",
            };
          }
        },
      }),
      read_past_drafts: tool({
        description:
          "Fetch the user's recent draft bodies for discovery and voice calibration. Use when asked to match recent style, synthesize with voice calibration, or find likely drafts before reading a specific one. For showing, embedding, opening, revising, or comparing an exact draft, call read_draft with that draft id.",
        inputSchema: z.object({
          limit: z.number().int().min(1).max(20).default(5),
          status: z
            .enum(["any", "draft", "copied", "dismissed"])
            .default("any"),
        }),
        execute: async ({ limit, status }) => {
          const rows = await listRecentDrafts(user.id, { limit, status });
          return {
            ok: true,
            drafts: rows.map((r) => ({
              id: r.id,
              body: r.body,
              status: r.status,
              post_type: r.post_type,
              created_at: r.created_at,
            })),
          };
        },
      }),
      read_draft: tool({
        description:
          "Fetch one saved draft by id, including the full body, so the model can work from it and the chat UI can render it as an embedded draft. Use for [draft:<uuid>] tokens, 'pull it up', 'show/embed/open that draft', revisions, and comparisons that need the exact draft body.",
        inputSchema: z.object({
          id: z.uuid(),
        }),
        execute: async ({ id }) => {
          const row = await getDraft(user.id, id);
          if (!row) return { ok: false, error: "not_found" };
          return {
            ok: true,
            draft: row,
          };
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
          return { ok: true, id: row.id, draft: row };
        },
      }),
      synthesize_from_news: tool({
        description:
          "Generate a LinkedIn draft from recent news signals using the user's niche, voice, and writing preferences. Returns the draft body. Pass an optional post_type to force a specific post shape; otherwise the synthesis picks one based on the source and the user's preferred_post_types.",
        inputSchema: z.object({
          signal_ids: z.array(z.uuid()).min(1).max(5),
          post_type: z.enum(POST_TYPES).optional(),
        }),
        execute: async ({ signal_ids, post_type }) => {
          const signals = await listSignalsByIds(user.id, signal_ids);
          if (signals.length === 0) {
            return { ok: false, error: "no_signals_found" };
          }
          try {
            const { body, post_type: chosenType } = await synthesizeFromSignals(
              {
                mode: "news",
                signals,
                profile,
                postType: post_type as PostType | undefined,
              },
            );
            return { ok: true, body, signal_ids, post_type: chosenType };
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
          "Replace a draft body. Pass the id returned by a prior save_as_draft to revise that exact draft, or omit id to update the active draft from the chat URL. Use this for revisions instead of save_as_draft so the Drafts rail shows one card that evolves rather than a pile of versions.",
        inputSchema: z.object({
          body: z.string().min(1).max(20000),
          id: z.uuid().optional(),
        }),
        execute: async ({ body, id }) => {
          const target = id ?? activeDraftId;
          if (!target) return { ok: false, error: "no_target_draft" };
          const owned = await getDraft(user.id, target);
          if (!owned) return { ok: false, error: "not_found" };
          const row = await updateDraft(user.id, target, { body });
          return { ok: true, id: row.id, draft: row };
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
      list_sources: tool({
        description:
          "List the user's monitored RSS feeds. Use when they ask what feeds they have, want to manage feeds, or before removing/updating one (so you have the id).",
        inputSchema: z.object({}),
        execute: async () => {
          const rows = await listSources(user.id);
          return {
            ok: true,
            sources: rows.map((s) => ({
              id: s.id,
              handle: s.handle,
              url: s.url,
              topic_tags: s.topic_tags,
              poll_interval_hours: s.poll_interval_hours,
              last_polled_at: s.last_polled_at,
            })),
          };
        },
      }),
      add_source: tool({
        description:
          "Add a new RSS feed for the user. Validates the feed first via probe; on success the feed is saved and will be polled on the next cron tick.",
        inputSchema: z.object({
          url: z.string().url().max(500),
          topic_tags: z.array(z.string().min(1).max(64)).max(20).optional(),
        }),
        execute: async ({ url, topic_tags }) => {
          const probe = await probeFeed(url);
          if (!probe.ok) {
            return { ok: false, error: "probe_failed", message: probe.message };
          }
          try {
            const row = await createSource(user.id, {
              kind: "rss_feed",
              handle: probe.title.slice(0, 80),
              url,
              topic_tags,
            });
            return { ok: true, id: row.id, handle: row.handle };
          } catch (error) {
            return {
              ok: false,
              error: "create_failed",
              message:
                error instanceof Error ? error.message : "create failed",
            };
          }
        },
      }),
      remove_source: tool({
        description:
          "Remove an RSS feed by id. Get ids from list_sources. Confirms with the user before destructive action when in doubt.",
        inputSchema: z.object({
          id: z.uuid(),
        }),
        execute: async ({ id }) => {
          try {
            await deleteSource(user.id, id);
            return { ok: true };
          } catch {
            return { ok: false, error: "delete_failed" };
          }
        },
      }),
      update_source: tool({
        description:
          "Update fields on an existing RSS feed (rename via handle, change topic_tags, or change poll_interval_hours). Cannot change the feed URL — to switch URL, remove and re-add.",
        inputSchema: z.object({
          id: z.uuid(),
          patch: z
            .object({
              handle: z.string().min(1).max(80).optional(),
              topic_tags: z
                .array(z.string().min(1).max(64))
                .max(20)
                .optional(),
              poll_interval_hours: z.number().int().min(1).max(168).optional(),
            })
            .refine((p) => Object.keys(p).length > 0, {
              message: "patch must have at least one field",
            }),
        }),
        execute: async ({ id, patch }) => {
          try {
            const row = await updateSource(user.id, id, patch);
            return {
              ok: true,
              id: row.id,
              handle: row.handle,
              topic_tags: row.topic_tags,
              poll_interval_hours: row.poll_interval_hours,
            };
          } catch {
            return { ok: false, error: "update_failed" };
          }
        },
      }),
      list_niche_bundles: tool({
        description:
          "Return the curated niche feed bundles available for one-click subscribe (AI/ML, SaaS founders, DevTools, etc.). Use when the user asks what to follow or wants suggestions.",
        inputSchema: z.object({}),
        execute: async () => {
          return {
            ok: true,
            bundles: NICHE_BUNDLES.map((b) => ({
              id: b.id,
              label: b.label,
              description: b.description,
              feeds: b.feeds.map((f) => ({ url: f.url, title: f.title })),
            })),
          };
        },
      }),
      add_niche_bundle: tool({
        description:
          "Subscribe the user to all feeds in a niche bundle by id (use list_niche_bundles to discover ids). Probes each URL and inserts the ones that respond.",
        inputSchema: z.object({
          bundle_id: z.string().min(1).max(64),
        }),
        execute: async ({ bundle_id }) => {
          const bundle = NICHE_BUNDLES.find((b) => b.id === bundle_id);
          if (!bundle) return { ok: false, error: "bundle_not_found" };

          const results = await Promise.all(
            bundle.feeds.map(async (feed) => {
              const probe = await probeFeed(feed.url);
              if (!probe.ok) {
                return {
                  ok: false as const,
                  url: feed.url,
                  reason: probe.message,
                };
              }
              try {
                const row = await createSource(user.id, {
                  kind: "rss_feed",
                  handle: probe.title.slice(0, 80),
                  url: feed.url,
                  topic_tags: [bundle.id],
                });
                return {
                  ok: true as const,
                  url: feed.url,
                  handle: row.handle,
                };
              } catch (error) {
                return {
                  ok: false as const,
                  url: feed.url,
                  reason:
                    error instanceof Error ? error.message : "create failed",
                };
              }
            }),
          );

          return {
            ok: true,
            bundle_id: bundle.id,
            added: results
              .filter((r) => r.ok)
              .map((r) => ({ url: r.url, handle: r.handle })),
            skipped: results
              .filter((r) => !r.ok)
              .map((r) => ({ url: r.url, reason: r.reason })),
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
