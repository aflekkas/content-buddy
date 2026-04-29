import { listChats } from "@/lib/db/queries";
import { ChatSwitcherClient } from "./chat-switcher-client";

type Props = {
  userId: string;
};

export async function ChatSwitcherLoader({ userId }: Props) {
  const chats = await listChats(userId);
  return <ChatSwitcherClient chats={chats} />;
}
