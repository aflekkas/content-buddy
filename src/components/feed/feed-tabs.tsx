"use client";

import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

type FeedTab = "signals" | "drafts";

type Props = {
  activeTab: FeedTab;
  onChange: (tab: FeedTab) => void;
  signalCount: number;
  draftCount: number;
};

export function FeedTabs({
  activeTab,
  onChange,
  signalCount,
  draftCount,
}: Props) {
  const tabs = [
    { id: "signals" as const, label: "Signals", count: signalCount },
    { id: "drafts" as const, label: "Drafts", count: draftCount },
  ];

  return (
    <div className="inline-flex rounded-xl border bg-background p-1 shadow-sm">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "relative rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
            activeTab === tab.id && "text-foreground",
          )}
        >
          <AnimatePresence initial={false}>
            {activeTab === tab.id && (
              <motion.span
                layoutId="feed-tab-active"
                className="absolute inset-0 rounded-lg bg-muted"
                transition={{ duration: 0.18 }}
              />
            )}
          </AnimatePresence>
          <span className="relative z-10">
            {tab.label}
            <span className="ml-1.5 text-xs text-muted-foreground">
              {tab.count}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
