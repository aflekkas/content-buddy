import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getChat, getMessages } from "@/lib/db/queries";
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

  if (!user) redirect("/login");

  const chat = await getChat(id, user.id);
  if (!chat) notFound();

  const rows = await getMessages(id);
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
    />
  );
}
