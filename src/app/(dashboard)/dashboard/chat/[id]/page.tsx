import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import {
  getActiveModel,
  getChat,
  getCachedMessages,
  getDecryptedProviderKey,
  getStarterPrompts,
} from "@/lib/db/queries";
import { toUIMessages } from "@/lib/chat-messages";
import { Chat } from "@/components/chat/chat";
import { FALLBACK_STARTER_PROMPTS } from "@/lib/starter-prompts";

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
  const [page, starterPrompts, apiKey] = await Promise.all([
    getCachedMessages(id, { limit: 50 }),
    getStarterPrompts(user.id),
    getDecryptedProviderKey(user.id, active.provider),
  ]);
  const initialMessages = toUIMessages(page.messages);

  return (
    <Chat
      chatId={id}
      initialMessages={initialMessages}
      initialHasMore={page.hasMore}
      initialStarterPrompts={
        starterPrompts?.prompts.length === 6
          ? starterPrompts.prompts
          : FALLBACK_STARTER_PROMPTS
      }
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
