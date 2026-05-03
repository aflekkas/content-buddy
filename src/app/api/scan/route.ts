import { errorResponse, jsonResponse, requireAuth } from "@/lib/api";
import {
  createDraft,
  getUserProfile,
  listSignals,
  updateSignal,
} from "@/lib/db/queries";
import type { SignalRow } from "@/lib/db/types";
import { synthesizeFromSignals } from "@/lib/synthesis";

const RECENT_DAYS = 14;
const NEWS_SIGNAL_COUNT = 3;

function recentCutoffIso() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RECENT_DAYS);
  return cutoff.toISOString();
}

function pickSignals(rows: SignalRow[], n: number) {
  return rows.filter((row) => row.status !== "dismissed").slice(0, n);
}

export async function POST() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const userId = auth.user.id;

  const [profile, allSignals] = await Promise.all([
    getUserProfile(userId),
    listSignals(userId, { limit: 200, postedAfter: recentCutoffIso() }),
  ]);

  const chosen = pickSignals(allSignals, NEWS_SIGNAL_COUNT);
  if (chosen.length === 0) {
    return errorResponse("no_news_signals", 400, {
      message: "No recent news signals. Add an RSS feed or run a poll first.",
    });
  }

  try {
    const { body } = await synthesizeFromSignals({
      mode: "news",
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
