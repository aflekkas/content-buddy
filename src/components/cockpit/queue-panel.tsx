"use client";

import { useEffect, useState } from "react";
import { FileText, Newspaper } from "lucide-react";
import { ColumnHeader } from "@/components/cockpit/column-header";
import { DraftsList } from "@/components/drafts/drafts-list";
import { NewsList, type NewsSignal } from "@/components/news/news-list";
import { cn } from "@/lib/utils";
import type { DraftRow, MonitoredSourceRow } from "@/lib/db/types";

type Tab = "drafts" | "news";

const STORAGE_KEY = "linkedin-studio:queue-tab";

type Props = {
  initialDrafts: DraftRow[];
  initialSources: MonitoredSourceRow[];
  initialSignals: NewsSignal[];
  userId: string;
};

export function QueuePanel({
  initialDrafts,
  initialSources,
  initialSignals,
  userId,
}: Props) {
  const [tab, setTab] = useState<Tab>("drafts");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "drafts" || stored === "news") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration sync
      setTab(stored);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, tab);
  }, [tab]);

  const draftsCount = initialDrafts.filter(
    (d) => d.status !== "dismissed",
  ).length;
  const signalsCount = initialSignals.filter(
    (s) => s.status !== "dismissed",
  ).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ColumnHeader
        title={tab === "drafts" ? "Drafts" : "News"}
        icon={tab === "drafts" ? FileText : Newspaper}
        iconTone="queue"
      />
      <div className="flex shrink-0 items-center gap-1 border-b bg-muted/20 p-2 text-xs">
        <TabButton
          active={tab === "drafts"}
          onClick={() => setTab("drafts")}
          label="Drafts"
          count={draftsCount}
        />
        <TabButton
          active={tab === "news"}
          onClick={() => setTab("news")}
          label="News"
          count={signalsCount}
        />
      </div>
      {tab === "drafts" ? (
        <DraftsList initialDrafts={initialDrafts} />
      ) : (
        <NewsList
          initialSources={initialSources}
          initialSignals={initialSignals}
          userId={userId}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px]",
          active ? "bg-muted" : "bg-muted/60",
        )}
      >
        {count}
      </span>
    </button>
  );
}
