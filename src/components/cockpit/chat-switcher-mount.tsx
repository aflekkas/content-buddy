"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { ChatSwitcher } from "@/components/cockpit/chat-switcher";
import type { ChatRow } from "@/lib/db/types";

type Props = {
  chats: ChatRow[];
};

export function ChatSwitcherMount({ chats }: Props) {
  const pathname = usePathname() ?? "";
  const activeChatId = useMemo(() => {
    const match = pathname.match(/^\/dashboard\/chat\/([^/?#]+)/);
    return match ? match[1] : null;
  }, [pathname]);

  const activeTitle = useMemo(() => {
    if (!activeChatId) return "New chat";
    const chat = chats.find((c) => c.id === activeChatId);
    return chat?.title || "New chat";
  }, [activeChatId, chats]);

  return (
    <ChatSwitcher
      chats={chats}
      activeChatId={activeChatId}
      activeTitle={activeTitle}
    />
  );
}
