import { z } from "zod";
import { errorResponse, jsonResponse, parseBody, requireAuth } from "@/lib/api";
import {
  getOrCreateLifeJournalSource,
  insertSignals,
  updateSignal,
} from "@/lib/db/queries";

const PostBody = z.object({
  body: z.string().trim().min(1).max(8000),
});

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const parsed = await parseBody(req, PostBody, {
    errorCode: "invalid_body",
    includeDetails: true,
  });
  if (!parsed.ok) return parsed.response;

  const source = await getOrCreateLifeJournalSource(auth.user.id);
  const now = new Date();
  const externalId = `journal:${now.getTime()}:${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  const inserted = await insertSignals(auth.user.id, source.id, [
    {
      external_id: externalId,
      url: `journal://${externalId}`,
      posted_at: now.toISOString(),
      raw: { text: parsed.data.body, kind: "life_journal" },
    },
  ]);

  if (inserted.length === 0) {
    return errorResponse("insert_failed", 500);
  }

  const signal = inserted[0];
  const summary = parsed.data.body.replace(/\s+/g, " ").slice(0, 120);
  const updated = await updateSignal(auth.user.id, signal.id, {
    summary,
    relevance_score: 1,
  });

  return jsonResponse({ signal: updated, source }, { status: 201 });
}
