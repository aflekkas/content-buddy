import { z } from "zod";
import { errorResponse, jsonResponse, parseBody, requireAuth } from "@/lib/api";
import {
  createDraft,
  getUserProfile,
  listSignals,
  listSources,
  updateSignal,
} from "@/lib/db/queries";
import type { SignalRow } from "@/lib/db/types";
import { synthesizeFromSignals, type SynthMode } from "@/lib/synthesis";

const PostBody = z.object({
  mode: z.enum(["news", "life", "mix"]),
});

const RECENT_DAYS = 7;
const NEWS_SIGNAL_COUNT = 3;
const LIFE_SIGNAL_COUNT = 3;

function recentCutoffIso() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RECENT_DAYS);
  return cutoff.toISOString();
}

function pickSignals(rows: SignalRow[], n: number) {
  return rows
    .filter((row) => row.status !== "dismissed")
    .slice(0, n);
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const parsed = await parseBody(req, PostBody, {
    errorCode: "invalid_body",
    includeDetails: true,
  });
  if (!parsed.ok) return parsed.response;

  const mode: SynthMode = parsed.data.mode;
  const userId = auth.user.id;

  const [profile, allSignals, sources] = await Promise.all([
    getUserProfile(userId),
    listSignals(userId, { limit: 200, postedAfter: recentCutoffIso() }),
    listSources(userId),
  ]);

  const sourceKindById = new Map(sources.map((s) => [s.id, s.kind]));
  const newsSignals = allSignals.filter(
    (s) => sourceKindById.get(s.source_id) === "rss_feed",
  );
  const lifeSignals = allSignals.filter(
    (s) => sourceKindById.get(s.source_id) === "life_journal",
  );

  let chosen: SignalRow[];
  if (mode === "news") {
    chosen = pickSignals(newsSignals, NEWS_SIGNAL_COUNT);
    if (chosen.length === 0) {
      return errorResponse("no_news_signals", 400, {
        message: "No recent news signals. Add an RSS feed or run a poll first.",
      });
    }
  } else if (mode === "life") {
    chosen = pickSignals(lifeSignals, LIFE_SIGNAL_COUNT);
    if (chosen.length === 0) {
      return errorResponse("no_life_signals", 400, {
        message:
          "No recent journal entries. Drop a journal note in the feed first.",
      });
    }
  } else {
    const news = pickSignals(newsSignals, 2);
    const life = pickSignals(lifeSignals, 2);
    chosen = [...life, ...news];
    if (chosen.length === 0) {
      return errorResponse("no_signals", 400, {
        message: "Nothing to mix yet. Add a feed or a journal note.",
      });
    }
  }

  try {
    const { body } = await synthesizeFromSignals({
      userId,
      mode,
      signals: chosen,
      niche: profile?.niche ?? null,
      voiceNotes: profile?.voice_notes ?? null,
      voiceSamples: profile?.voice_samples ?? null,
    });
    const draft = await createDraft(userId, {
      body,
      signal_ids: chosen.map((s) => s.id),
    });
    await Promise.all(
      chosen.map((s) => updateSignal(userId, s.id, { status: "drafted" })),
    );
    return jsonResponse(draft, { status: 201 });
  } catch (error) {
    return errorResponse("generation_failed", 500, {
      message:
        error instanceof Error ? error.message : "Could not synthesize draft.",
    });
  }
}
