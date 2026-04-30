import { jsonResponse, requireAuth, requireProviderKey } from "@/lib/api";
import {
  createChat,
  getActiveModel,
  markOnboarded,
} from "@/lib/db/queries";

export const maxDuration = 15;

export async function POST() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { provider } = await getActiveModel(auth.user.id);
  const key = await requireProviderKey(auth.user.id, provider);
  if (!key.ok) return key.response;

  const chat = await createChat(auth.user.id);
  await markOnboarded(auth.user.id);

  return jsonResponse({ chatId: chat.id });
}
