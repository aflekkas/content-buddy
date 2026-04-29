import { errorResponse, jsonResponse, notFound, requireAuth } from "@/lib/api";
import { getCachedMessages, getChat } from "@/lib/db/queries";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const chat = await getChat(id, auth.user.id);
  if (!chat) return notFound();

  const { searchParams } = new URL(req.url);
  const beforeParam = searchParams.get("before") ?? undefined;
  const limitParam = searchParams.get("limit");

  if (beforeParam !== undefined) {
    const ts = Date.parse(beforeParam);
    if (isNaN(ts)) {
      return errorResponse("invalid before parameter", 422);
    }
  }

  const limit = limitParam
    ? Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 100)
    : 50;

  const page = await getCachedMessages(id, { limit, before: beforeParam });

  return jsonResponse(page);
}
