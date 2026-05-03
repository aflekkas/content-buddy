import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { listChats, listDrafts, listFacts } from "@/lib/db/queries";
import { CockpitShell } from "@/components/cockpit/cockpit-shell";
import { ActiveDraftsProvider } from "@/components/cockpit/active-drafts-context";
import { ChatSwitcherMount } from "@/components/cockpit/chat-switcher-mount";
import { MemoryRail } from "@/components/memory/memory-rail";
import { DraftsQueue } from "@/components/drafts/drafts-queue";

export default async function DashboardShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const [facts, drafts, chats] = await Promise.all([
    listFacts(user.id),
    listDrafts(user.id),
    listChats(user.id),
  ]);

  return (
    <ActiveDraftsProvider>
      <CockpitShell
        user={{ id: user.id, email: user.email ?? "" }}
        memorySlot={<MemoryRail initialFacts={facts} />}
        draftsSlot={<DraftsQueue initialDrafts={drafts} />}
        chatSwitcherSlot={<ChatSwitcherMount chats={chats} />}
      >
        {children}
      </CockpitShell>
    </ActiveDraftsProvider>
  );
}
