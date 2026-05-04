"use client";

import { Newspaper } from "lucide-react";
import { ColumnHeader } from "@/components/cockpit/column-header";
import { NewsList, type NewsSignal } from "@/components/news/news-list";
import type { MonitoredSourceRow } from "@/lib/db/types";

type Props = {
  initialSources: MonitoredSourceRow[];
  initialSignals: NewsSignal[];
  initialTotalCount: number;
  pageSize: number;
  userId: string;
};

export function NewsRail({
  initialSources,
  initialSignals,
  initialTotalCount,
  pageSize,
  userId,
}: Props) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ColumnHeader
        title="News"
        icon={Newspaper}
        iconTone="news"
        description={`${initialSources.length} feed${initialSources.length === 1 ? "" : "s"} · ${initialTotalCount} signal${initialTotalCount === 1 ? "" : "s"}`}
      />
      <NewsList
        initialSources={initialSources}
        initialSignals={initialSignals}
        initialTotalCount={initialTotalCount}
        pageSize={pageSize}
        userId={userId}
      />
    </div>
  );
}
