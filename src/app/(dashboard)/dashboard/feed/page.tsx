import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { listDrafts, listSignals, listSources } from "@/lib/db/queries";
import { FeedPage } from "@/components/feed/feed-page";

export default async function DashboardFeedPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const [signals, drafts, sources] = await Promise.all([
    listSignals(user.id, { limit: 500 }),
    listDrafts(user.id),
    listSources(user.id),
  ]);

  const sourceHandles = new Map(
    sources.map((source) => [source.id, source.handle]),
  );
  const sourceKinds = new Map(
    sources.map((source) => [source.id, source.kind]),
  );
  const signalHandles = new Map(
    signals.map((signal) => [
      signal.id,
      sourceHandles.get(signal.source_id) ?? null,
    ]),
  );

  return (
    <FeedPage
      initialSignals={signals
        .filter((signal) => signal.status !== "dismissed")
        .sort((a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0))
        .map((signal) => ({
          ...signal,
          sourceHandle: sourceHandles.get(signal.source_id) ?? null,
          sourceKind: sourceKinds.get(signal.source_id) ?? null,
        }))}
      initialDrafts={drafts
        .filter((draft) => draft.status !== "dismissed")
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        .map((draft) => ({
          ...draft,
          sourceHandles: draft.signal_ids
            .map((id) => signalHandles.get(id))
            .filter((handle): handle is string => Boolean(handle)),
        }))}
    />
  );
}
