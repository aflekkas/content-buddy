import { getCachedMessages } from "@/lib/db/queries";
import type { ChatRow } from "@/lib/db/types";
import { toUIMessages } from "@/lib/chat-messages";
import { Chat } from "@/components/chat/chat";

type Props = {
  draftId: string;
  chat: ChatRow;
};

export async function DraftChatSidebar({ draftId, chat }: Props) {
  const page = await getCachedMessages(chat.id, { limit: 50 });

  return (
    <aside className="hidden min-h-0 w-[380px] shrink-0 rounded-2xl border bg-background shadow-sm lg:flex">
      <Chat
        chatId={chat.id}
        draftId={draftId}
        initialMessages={toUIMessages(page.messages)}
        initialHasMore={page.hasMore}
        initialUsage={{
          inputTokens: chat.input_tokens,
          outputTokens: chat.output_tokens,
          cacheReadTokens: chat.cache_read_tokens,
          cacheCreationTokens: chat.cache_creation_tokens,
        }}
        hasActiveKey
        activeProviderId="openai"
        activeModelId="gpt-4o-mini"
      />
    </aside>
  );
}
