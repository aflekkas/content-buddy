import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getCachedMessages, getChat } from "@/lib/db/queries";
import { toUIMessages } from "@/lib/chat-messages";
import { Chat } from "@/components/chat/chat";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ChatThreadPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const { id } = await params;

  const chat = await getChat(id, user.id);
  if (!chat) notFound();

  const page = await getCachedMessages(chat.id, { limit: 50 });

  const hasActiveKey = Boolean(process.env.OPENAI_API_KEY);

  return (
    <Chat
      chatId={chat.id}
      initialMessages={toUIMessages(page.messages)}
      initialHasMore={page.hasMore}
      initialUsage={{
        inputTokens: chat.input_tokens,
        outputTokens: chat.output_tokens,
        cacheReadTokens: chat.cache_read_tokens,
        cacheCreationTokens: chat.cache_creation_tokens,
      }}
      hasActiveKey={hasActiveKey}
      activeProviderId="openai"
      activeModelId="gpt-4o-mini"
    />
  );
}
