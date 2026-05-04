import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import {
  countSignals,
  listChats,
  listDrafts,
  listFacts,
  listSignals,
  listSources,
} from "@/lib/db/queries";
import { CockpitShell } from "@/components/cockpit/cockpit-shell";
import { ActiveDraftsProvider } from "@/components/cockpit/active-drafts-context";
import { ChatSwitcherMount } from "@/components/cockpit/chat-switcher-mount";
import { MemoryRail } from "@/components/memory/memory-rail";
import { DraftsList } from "@/components/drafts/drafts-list";
import { NewsRail } from "@/components/news/news-rail";

const SIGNALS_PAGE_SIZE = 10;

export default async function DashboardShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const [facts, drafts, chats, sources, signals, totalSignalCount] =
    await Promise.all([
      listFacts(user.id),
      listDrafts(user.id),
      listChats(user.id),
      listSources(user.id),
      listSignals(user.id, {
        limit: SIGNALS_PAGE_SIZE,
        statusNot: "dismissed",
      }),
      countSignals(user.id, { statusNot: "dismissed" }),
    ]);

  const sourceHandles = new Map(
    sources.map((source) => [source.id, source.handle]),
  );
  const initialSignals = signals.map((signal) => ({
    ...signal,
    sourceHandle: sourceHandles.get(signal.source_id) ?? null,
  }));

  return (
    <ActiveDraftsProvider>
      <CockpitShell
        user={{ id: user.id, email: user.email ?? "" }}
        memorySlot={<MemoryRail initialFacts={facts} />}
        draftsSlot={<DraftsList initialDrafts={drafts} />}
        newsSlot={
          <NewsRail
            initialSources={sources}
            initialSignals={initialSignals}
            initialTotalCount={totalSignalCount}
            pageSize={SIGNALS_PAGE_SIZE}
            userId={user.id}
          />
        }
        chatSwitcherSlot={<ChatSwitcherMount chats={chats} />}
      >
        {children}
      </CockpitShell>
    </ActiveDraftsProvider>
  );
}
