import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import {
  countSignals,
  getUserProfile,
  listChats,
  listDrafts,
  listMemories,
  listSignals,
  listSources,
} from "@/lib/db/queries";
import { CockpitShell } from "@/components/cockpit/cockpit-shell";
import { ActiveDraftsProvider } from "@/components/cockpit/active-drafts-context";
import { ChatSwitcherMount } from "@/components/cockpit/chat-switcher-mount";
import { MemoryRail } from "@/components/memory/memory-rail";
import { DraftsList } from "@/components/drafts/drafts-list";
import { NewsRail } from "@/components/news/news-rail";
import { SettingsRail } from "@/components/settings/settings-rail";

const SIGNALS_PAGE_SIZE = 10;

export default async function DashboardShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const [memories, drafts, chats, sources, signals, totalSignalCount, profile] =
    await Promise.all([
      listMemories(user.id),
      listDrafts(user.id),
      listChats(user.id),
      listSources(user.id),
      listSignals(user.id, {
        limit: SIGNALS_PAGE_SIZE,
        statusNot: "dismissed",
      }),
      countSignals(user.id, { statusNot: "dismissed" }),
      getUserProfile(user.id),
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
        memorySlot={<MemoryRail initialMemories={memories} />}
        draftsSlot={<DraftsList initialDrafts={drafts} userId={user.id} />}
        newsSlot={
          <NewsRail
            initialSources={sources}
            initialSignals={initialSignals}
            initialTotalCount={totalSignalCount}
            pageSize={SIGNALS_PAGE_SIZE}
            userId={user.id}
          />
        }
        settingsSlot={<SettingsRail initialProfile={profile} />}
        chatSwitcherSlot={<ChatSwitcherMount key="chat-switcher" chats={chats} />}
      >
        {children}
      </CockpitShell>
    </ActiveDraftsProvider>
  );
}
