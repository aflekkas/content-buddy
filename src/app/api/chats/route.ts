import { jsonResponse, requireAuth } from "@/lib/api";
import { createChat } from "@/lib/db/queries";

export async function POST() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const chat = await createChat(auth.user.id);
  return jsonResponse(chat, { status: 201 });
}
