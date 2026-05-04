import { errorResponse, jsonResponse, requireAuth } from "@/lib/api";
import {
  getUserProfileForCron,
  insertSignals,
  listAllSourcesForCron,
  updateSignal,
  updateSource,
} from "@/lib/db/queries";
import type { MonitoredSourceRow } from "@/lib/db/types";
import { FETCHERS } from "@/lib/sources";
import type { FetchedPost } from "@/lib/sources/types";
import { scoreRelevance } from "@/lib/synthesis";

export const maxDuration = 300;

export type ScanEvent =
  | { type: "start"; sources: number }
  | {
      type: "source_skip";
      handle: string;
      reason: "not_due" | "no_fetcher";
    }
  | { type: "fetch_start"; handle: string; url: string }
  | {
      type: "fetch_done";
      handle: string;
      fetched: number;
      inserted: number;
    }
  | { type: "score_done"; handle: string; score: number; summary: string }
  | { type: "source_done"; handle: string }
  | { type: "source_error"; handle: string; message: string }
  | { type: "user_error"; userId: string; message: string }
  | { type: "summary"; summary: Summary };

type Summary = {
  users_processed: number;
  sources_polled: number;
  signals_inserted: number;
  errors: string[];
};

function isDue(
  timestamp: string | null,
  intervalHours: number,
  now: Date,
): boolean {
  if (!timestamp) return true;
  const elapsedMs = now.getTime() - new Date(timestamp).getTime();
  return elapsedMs > intervalHours * 60 * 60 * 1000;
}

function toSignalInput(post: FetchedPost) {
  return {
    external_id: post.externalId,
    url: post.url,
    posted_at: post.postedAt.toISOString(),
    raw: { ...post.raw, text: post.text },
  };
}

function groupByUser(sources: MonitoredSourceRow[]) {
  const byUser = new Map<string, MonitoredSourceRow[]>();
  for (const source of sources) {
    const existing = byUser.get(source.user_id) ?? [];
    existing.push(source);
    byUser.set(source.user_id, existing);
  }
  return byUser;
}

async function* runPoll(
  targetUserId: string | null,
): AsyncGenerator<ScanEvent, void, void> {
  const now = new Date();
  const allSources = await listAllSourcesForCron();
  const sources = targetUserId
    ? allSources.filter((source) => source.user_id === targetUserId)
    : allSources;

  const summary: Summary = {
    users_processed: 0,
    sources_polled: 0,
    signals_inserted: 0,
    errors: [],
  };

  yield { type: "start", sources: sources.length };

  for (const [userId, userSources] of groupByUser(sources)) {
    summary.users_processed += 1;

    let profile: Awaited<ReturnType<typeof getUserProfileForCron>> = null;
    try {
      profile = await getUserProfileForCron(userId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "profile load failed";
      console.error("[cron/poll-sources] profile", userId, error);
      summary.errors.push(`${userId}: profile: ${message}`);
      yield { type: "user_error", userId, message: `profile: ${message}` };
      continue;
    }

    for (const source of userSources) {
      if (!isDue(source.last_polled_at, source.poll_interval_hours, now)) {
        yield {
          type: "source_skip",
          handle: source.handle,
          reason: "not_due",
        };
        continue;
      }

      const fetcher = FETCHERS[source.kind];
      if (!fetcher) {
        yield {
          type: "source_skip",
          handle: source.handle,
          reason: "no_fetcher",
        };
        continue;
      }

      try {
        yield {
          type: "fetch_start",
          handle: source.handle,
          url: source.url ?? source.handle,
        };
        const posts = await fetcher.fetch(
          source.url ?? source.handle,
          source.last_polled_at ? new Date(source.last_polled_at) : null,
          {},
        );
        const inserted = await insertSignals(
          userId,
          source.id,
          posts.map(toSignalInput),
        );

        summary.sources_polled += 1;
        summary.signals_inserted += inserted.length;
        yield {
          type: "fetch_done",
          handle: source.handle,
          fetched: posts.length,
          inserted: inserted.length,
        };

        for (const signal of inserted) {
          const rawText = signal.raw.text;
          const signalText =
            typeof rawText === "string" ? rawText : signal.url;
          const scored = await scoreRelevance({
            signalText,
            niche: profile?.niche ?? null,
            voiceNotes: profile?.voice_notes ?? null,
          });
          await updateSignal(userId, signal.id, {
            summary: scored.summary,
            relevance_score: scored.score,
          });
          yield {
            type: "score_done",
            handle: source.handle,
            score: scored.score,
            summary: scored.summary,
          };
        }

        await updateSource(userId, source.id, {
          last_polled_at: now.toISOString(),
        });
        yield { type: "source_done", handle: source.handle };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "unknown source error";
        console.error(
          "[cron/poll-sources]",
          userId,
          source.handle,
          error,
        );
        summary.errors.push(`${userId}: ${source.handle}: ${message}`);
        yield {
          type: "source_error",
          handle: source.handle,
          message,
        };
      }
    }
  }

  yield { type: "summary", summary };
}

export async function GET(req: Request) {
  return handlePollSources(req);
}

export async function POST(req: Request) {
  return handlePollSources(req);
}

async function handlePollSources(req: Request) {
  const url = new URL(req.url);
  const targetUserId = url.searchParams.get("user_id")?.trim() || null;
  const stream = url.searchParams.get("stream") === "1";

  if (targetUserId) {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;
    if (auth.user.id !== targetUserId) {
      return errorResponse("unauthorized", 401);
    }
  } else {
    if (stream) return errorResponse("stream_requires_user", 400);
    const secret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization");
    if (!secret || authHeader !== `Bearer ${secret}`) {
      return errorResponse("unauthorized", 401);
    }
  }

  const generator = runPoll(targetUserId);

  if (stream) {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const event of generator) {
            controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "scan failed";
          controller.enqueue(
            encoder.encode(
              JSON.stringify({ type: "user_error", userId: targetUserId, message }) +
                "\n",
            ),
          );
        } finally {
          controller.close();
        }
      },
    });
    return new Response(body, {
      headers: {
        "content-type": "application/x-ndjson; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        "x-content-type-options": "nosniff",
      },
    });
  }

  let finalSummary: Summary = {
    users_processed: 0,
    sources_polled: 0,
    signals_inserted: 0,
    errors: [],
  };
  for await (const event of generator) {
    if (event.type === "summary") finalSummary = event.summary;
  }
  return jsonResponse(finalSummary);
}
