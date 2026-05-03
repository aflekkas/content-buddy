import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import {
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
import { QueuePanel } from "@/components/cockpit/queue-panel";

const SIGNALS_LOOKBACK_DAYS = 14;

export default async function DashboardShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - SIGNALS_LOOKBACK_DAYS);

  const [facts, drafts, chats, sources, signals] = await Promise.all([
    listFacts(user.id),
    listDrafts(user.id),
    listChats(user.id),
    listSources(user.id),
    listSignals(user.id, { limit: 200, postedAfter: cutoff.toISOString() }),
  ]);

  const sourceHandles = new Map(
    sources.map((source) => [source.id, source.handle]),
  );
  const initialSignals = signals
    .filter((signal) => signal.status !== "dismissed")
    .sort((a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0))
    .map((signal) => ({
      ...signal,
      sourceHandle: sourceHandles.get(signal.source_id) ?? null,
    }));

  return (
    <ActiveDraftsProvider>
      <CockpitShell
        user={{ id: user.id, email: user.email ?? "" }}
        memorySlot={<MemoryRail initialFacts={facts} />}
        queueSlot={
          <QueuePanel
            initialDrafts={drafts}
            initialSources={sources}
            initialSignals={initialSignals}
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
