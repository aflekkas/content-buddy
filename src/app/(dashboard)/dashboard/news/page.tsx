import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { listSignals, listSources } from "@/lib/db/queries";
import { NewsPage } from "@/components/news/news-page";

const RECENT_DAYS = 14;

export default async function NewsRoutePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RECENT_DAYS);

  const [sources, signals] = await Promise.all([
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
    <NewsPage
      initialSources={sources}
      initialSignals={initialSignals}
      userId={user.id}
    />
  );
}
