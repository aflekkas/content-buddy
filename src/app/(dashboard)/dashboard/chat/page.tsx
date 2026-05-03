import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/server";
import { listChats } from "@/lib/db/queries";
import { ChatSidebar } from "@/components/chat/chat-sidebar";

export default async function ChatIndexPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const chats = await listChats(user.id);
  if (chats.length > 0) {
    redirect(`/dashboard/chat/${chats[0].id}`);
  }

  return (
    <div className="flex min-h-0 flex-1">
      <ChatSidebar chats={chats} activeId={null} />
      <main className="flex min-h-0 flex-1 items-center justify-center p-6">
        <div className="flex max-w-md flex-col items-center gap-3 text-center">
          <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="size-5" />
          </div>
          <h1 className="text-lg font-semibold">LinkedIn Studio</h1>
          <p className="text-sm text-muted-foreground">
            Talk to your ghostwriter. Click <strong>New chat</strong> in the
            sidebar to start. The agent can scan news from your feeds, save
            memories, and draft posts.
          </p>
        </div>
      </main>
    </div>
  );
}
