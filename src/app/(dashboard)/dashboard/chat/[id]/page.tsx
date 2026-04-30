import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import {
  getActiveModel,
  getChat,
  getCachedMessages,
  getDecryptedProviderKey,
} from "@/lib/db/queries";
import { toUIMessages } from "@/lib/chat-messages";
import { Chat } from "@/components/chat/chat";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/");

  const chat = await getChat(id, user.id);
  if (!chat) notFound();

  const active = await getActiveModel(user.id);
  const [page, apiKey] = await Promise.all([
    getCachedMessages(id, { limit: 50 }),
    getDecryptedProviderKey(user.id, active.provider),
  ]);
  const initialMessages = toUIMessages(page.messages);

  return (
    <Chat
      chatId={id}
      initialMessages={initialMessages}
      initialHasMore={page.hasMore}
      initialUsage={{
        inputTokens: chat.input_tokens,
        outputTokens: chat.output_tokens,
        cacheReadTokens: chat.cache_read_tokens,
        cacheCreationTokens: chat.cache_creation_tokens,
      }}
      hasActiveKey={Boolean(apiKey)}
      activeProviderId={active.provider}
      activeModelId={active.model}
    />
  );
}
