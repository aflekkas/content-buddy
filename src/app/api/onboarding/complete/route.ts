import { jsonResponse, requireAuth } from "@/lib/api";
import { createChat, markOnboarded } from "@/lib/db/queries";

export const maxDuration = 15;

export async function POST() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const chat = await createChat(auth.user.id);
  await markOnboarded(auth.user.id);

  return jsonResponse({ chatId: chat.id });
}
