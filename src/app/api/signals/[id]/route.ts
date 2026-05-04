import { z } from "zod";
import { jsonResponse, notFound, parseBody, requireAuth } from "@/lib/api";
import { getSignal, getSource, updateSignal } from "@/lib/db/queries";

const PatchBody = z.object({
  status: z.enum(["queued", "dismissed"]),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const signal = await getSignal(auth.user.id, id);
  if (!signal) return notFound();
  const source = await getSource(auth.user.id, signal.source_id);
  return jsonResponse({ ...signal, sourceHandle: source?.handle ?? null });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const parsed = await parseBody(req, PatchBody);
  if (!parsed.ok) return parsed.response;

  const { id } = await params;
  const signal = await updateSignal(auth.user.id, id, parsed.data);
  return jsonResponse(signal);
}
