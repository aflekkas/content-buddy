import { errorResponse, jsonResponse, requireAuth } from "@/lib/api";
import {
  createDraft,
  getDecryptedExternalCredential,
  getUserProfileForCron,
  insertSignals,
  listAllSourcesForCron,
  listSignals,
  updateSignal,
  updateSource,
} from "@/lib/db/queries";
import type { MonitoredSourceRow, SignalRow } from "@/lib/db/types";
import { FETCHERS } from "@/lib/sources";
import type { FetchedPost } from "@/lib/sources/types";
import { scoreRelevance, synthesizeFromSignals } from "@/lib/synthesis";

export const maxDuration = 300;

type Summary = {
  users_processed: number;
  sources_polled: number;
  signals_inserted: number;
  drafts_created: number;
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

function isSynthesisDue(timestamp: string | null, now: Date): boolean {
  if (!timestamp) return true;
  const elapsedMs = now.getTime() - new Date(timestamp).getTime();
  return elapsedMs > 3 * 24 * 60 * 60 * 1000;
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

export async function GET(req: Request) {
  return handlePollSources(req);
}

export async function POST(req: Request) {
  return handlePollSources(req);
}

async function handlePollSources(req: Request) {
  const url = new URL(req.url);
  const targetUserId = url.searchParams.get("user_id")?.trim() || null;

  if (targetUserId) {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;
    if (auth.user.id !== targetUserId) {
      return errorResponse("unauthorized", 401);
    }
  } else {
    const secret = process.env.CRON_SECRET;
    const auth = req.headers.get("authorization");
    if (!secret || auth !== `Bearer ${secret}`) {
      return errorResponse("unauthorized", 401);
    }
  }

  const summary: Summary = {
    users_processed: 0,
    sources_polled: 0,
    signals_inserted: 0,
    drafts_created: 0,
    errors: [],
  };

  const now = new Date();
  const allSources = await listAllSourcesForCron();
  const sources = targetUserId
    ? allSources.filter((source) => source.user_id === targetUserId)
    : allSources;

  for (const [userId, userSources] of groupByUser(sources)) {
    summary.users_processed += 1;

    try {
      const apifyToken = await getDecryptedExternalCredential(userId, "apify");
      if (!apifyToken) {
        const message = `${userId}: no_apify_token`;
        console.log("[cron/poll-sources]", message);
        summary.errors.push(message);
        continue;
      }

      const profile = await getUserProfileForCron(userId);

      for (const source of userSources) {
        if (!isDue(source.last_polled_at, source.poll_interval_hours, now)) {
          continue;
        }

        const posts = await FETCHERS[source.kind].fetch(
          source.handle,
          source.last_polled_at ? new Date(source.last_polled_at) : null,
          { apifyToken },
        );
        const inserted = await insertSignals(
          userId,
          source.id,
          posts.map(toSignalInput),
        );

        summary.sources_polled += 1;
        summary.signals_inserted += inserted.length;

        for (const signal of inserted) {
          const rawText = signal.raw.text;
          const signalText = typeof rawText === "string" ? rawText : signal.url;
          const scored = await scoreRelevance({
            userId,
            signalText,
            niche: profile?.niche ?? null,
            voiceNotes: profile?.voice_notes ?? null,
          });
          await updateSignal(userId, signal.id, {
            summary: scored.summary,
            relevance_score: scored.score,
          });
        }

        await updateSource(userId, source.id, {
          last_polled_at: now.toISOString(),
        });
      }

      for (const source of userSources.filter(
        (item) =>
          item.kind === "x_self" &&
          isSynthesisDue(item.last_synthesized_at, now),
      )) {
        const recentSignals = await listSignals(userId, {
          limit: 50,
          sourceId: source.id,
          postedAfter: source.last_synthesized_at ?? undefined,
        });
        const usableSignals: SignalRow[] = recentSignals.filter(
          (signal) => signal.status !== "dismissed",
        );

        if (usableSignals.length >= 2) {
          const { body } = await synthesizeFromSignals({
            userId,
            signals: usableSignals,
            niche: profile?.niche ?? null,
            voiceNotes: profile?.voice_notes ?? null,
          });
          await createDraft(userId, {
            body,
            signal_ids: usableSignals.map((signal) => signal.id),
          });
          await updateSource(userId, source.id, {
            last_synthesized_at: now.toISOString(),
          });
          summary.drafts_created += 1;
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "unknown cron error";
      console.error("[cron/poll-sources]", userId, error);
      summary.errors.push(`${userId}: ${message}`);
    }
  }

  return jsonResponse(summary);
}
