import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const chat = await getChat(id, user.id);
  if (!chat) notFound();

  const [rows, active] = await Promise.all([
    getCachedMessages(id),
    getActiveModel(user.id),
  ]);
  const apiKey = await getDecryptedProviderKey(user.id, active.provider);
  const initialMessages = toUIMessages(rows);

  return (
    <Chat
      chatId={id}
      initialMessages={initialMessages}
      initialUsage={{
        inputTokens: chat.input_tokens,
        outputTokens: chat.output_tokens,
        cacheReadTokens: chat.cache_read_tokens,
        cacheCreationTokens: chat.cache_creation_tokens,
      }}
      hasActiveKey={Boolean(apiKey)}
      activeProviderId={active.provider}
    />
  );
}
