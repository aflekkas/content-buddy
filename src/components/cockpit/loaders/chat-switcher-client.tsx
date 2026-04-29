"use client";

import { useParams } from "next/navigation";
import { ChatSwitcher } from "@/components/cockpit/chat-switcher";
import type { ChatRow } from "@/lib/db/types";

type Props = {
  chats: ChatRow[];
};

export function ChatSwitcherClient({ chats }: Props) {
  const params = useParams<{ id?: string }>();
  const activeChatId = params?.id ?? "";
  const activeChat = chats.find((c) => c.id === activeChatId);
  const activeTitle = activeChat?.title?.trim() || "New chat";

  return (
    <ChatSwitcher
      chats={chats}
      activeChatId={activeChatId}
      activeTitle={activeTitle}
    />
  );
}
