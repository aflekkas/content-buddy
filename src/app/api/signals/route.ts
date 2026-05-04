import { errorResponse, jsonResponse, requireAuth } from "@/lib/api";
import { listSignals, listSources } from "@/lib/db/queries";
import type { SignalRow } from "@/lib/db/types";

const STATUSES: ReadonlySet<SignalRow["status"]> = new Set([
  "new",
  "queued",
  "drafted",
  "dismissed",
]);

export async function GET(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const statusNot = searchParams.get("status_not");
  const limitParam = searchParams.get("limit");
  const postedBefore = searchParams.get("posted_before");
  const withSourceHandle = searchParams.get("with_source_handle") === "1";

  if (status && !STATUSES.has(status as SignalRow["status"])) {
    return errorResponse("invalid_status", 400);
  }
  if (statusNot && !STATUSES.has(statusNot as SignalRow["status"])) {
    return errorResponse("invalid_status_not", 400);
  }

  const limit = limitParam ? parseInt(limitParam, 10) : undefined;
  const signals = await listSignals(auth.user.id, {
    limit: Number.isFinite(limit) ? limit : undefined,
    status: status ? (status as SignalRow["status"]) : undefined,
    statusNot: statusNot ? (statusNot as SignalRow["status"]) : undefined,
    postedBefore: postedBefore ?? undefined,
  });

  if (!withSourceHandle) {
    return jsonResponse(signals);
  }

  const sources = await listSources(auth.user.id);
  const handles = new Map(sources.map((s) => [s.id, s.handle]));
  return jsonResponse(
    signals.map((signal) => ({
      ...signal,
      sourceHandle: handles.get(signal.source_id) ?? null,
    })),
  );
}
