"use client";

import { Newspaper } from "lucide-react";
import { ColumnHeader } from "@/components/cockpit/column-header";
import { NewsList, type NewsSignal } from "@/components/news/news-list";
import type { MonitoredSourceRow } from "@/lib/db/types";

type Props = {
  initialSources: MonitoredSourceRow[];
  initialSignals: NewsSignal[];
  userId: string;
};

export function NewsRail({ initialSources, initialSignals, userId }: Props) {
  const visibleCount = initialSignals.filter(
    (s) => s.status !== "dismissed",
  ).length;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ColumnHeader
        title="News"
        icon={Newspaper}
        iconTone="news"
        description={`${initialSources.length} feed${initialSources.length === 1 ? "" : "s"} · ${visibleCount} signal${visibleCount === 1 ? "" : "s"}`}
      />
      <NewsList
        initialSources={initialSources}
        initialSignals={initialSignals}
        userId={userId}
      />
    </div>
  );
}
