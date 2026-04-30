import { errorResponse, jsonResponse, requireAuth } from "@/lib/api";
import { listSignals } from "@/lib/db/queries";
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
  const limitParam = searchParams.get("limit");

  if (status && !STATUSES.has(status as SignalRow["status"])) {
    return errorResponse("invalid_status", 400);
  }

  const limit = limitParam ? parseInt(limitParam, 10) : undefined;
  return jsonResponse(
    await listSignals(auth.user.id, {
      limit: Number.isFinite(limit) ? limit : undefined,
      status: status ? (status as SignalRow["status"]) : undefined,
    }),
  );
}
