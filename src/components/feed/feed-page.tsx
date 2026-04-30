"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeedTabs } from "@/components/feed/feed-tabs";
import { DraftCard, type FeedDraft } from "@/components/feed/draft-card";
import { SignalCard, type FeedSignal } from "@/components/feed/signal-card";

type Tab = "signals" | "drafts";

type Props = {
  initialSignals: FeedSignal[];
  initialDrafts: FeedDraft[];
};

export function FeedPage({ initialSignals, initialDrafts }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("signals");
  const [signals, setSignals] = useState(initialSignals);
  const [drafts, setDrafts] = useState(initialDrafts);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sortedSignals = useMemo(
    () =>
      signals
        .filter((signal) => signal.status !== "dismissed")
        .sort(
          (a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0),
        ),
    [signals],
  );
  const sortedDrafts = useMemo(
    () =>
      drafts
        .filter((draft) => draft.status !== "dismissed")
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
    [drafts],
  );

  async function handleDraft(signalId: string) {
    setBusyId(signalId);
    try {
      const res = await fetch(`/api/signals/${signalId}/draft`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("draft_failed");
      const draft = (await res.json()) as { id: string };
      startTransition(() => router.push(`/dashboard/drafts/${draft.id}`));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDismissSignal(signalId: string) {
    setBusyId(signalId);
    try {
      const res = await fetch(`/api/signals/${signalId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "dismissed" }),
      });
      if (!res.ok) throw new Error("dismiss_failed");
      setSignals((current) =>
        current.map((signal) =>
          signal.id === signalId ? { ...signal, status: "dismissed" } : signal,
        ),
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleDismissDraft(draftId: string) {
    setBusyId(draftId);
    try {
      const res = await fetch(`/api/drafts/${draftId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete_failed");
      setDrafts((current) =>
        current.map((draft) =>
          draft.id === draftId ? { ...draft, status: "dismissed" } : draft,
        ),
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <FeedTabs
            activeTab={activeTab}
            onChange={setActiveTab}
            signalCount={sortedSignals.length}
            draftCount={sortedDrafts.length}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setActiveTab("drafts")}
          >
            Drafts
            <span className="ml-1 text-xs text-muted-foreground">
              {sortedDrafts.length}
            </span>
          </Button>
        </div>

        {activeTab === "signals" ? (
          sortedSignals.length > 0 ? (
            <div className="grid gap-3">
              {sortedSignals.map((signal) => (
                <SignalCard
                  key={signal.id}
                  signal={signal}
                  onDraft={handleDraft}
                  onDismiss={handleDismissSignal}
                  busy={busyId === signal.id || isPending}
                />
              ))}
            </div>
          ) : (
            <EmptySignals />
          )
        ) : sortedDrafts.length > 0 ? (
          <div className="grid gap-3">
            {sortedDrafts.map((draft) => (
              <DraftCard
                key={draft.id}
                draft={draft}
                onDismiss={handleDismissDraft}
                busy={busyId === draft.id}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border bg-background p-8 text-center shadow-sm">
            <p className="text-sm text-muted-foreground">
              No drafts yet. Create one from a signal when something looks useful.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

function EmptySignals() {
  return (
    <div className="rounded-2xl border bg-background p-8 text-center shadow-sm">
      <p className="text-sm text-muted-foreground">
        No signals yet. Run a poll or wait for the next cron.
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled
        className="mt-4"
        title="Polling is currently cron-only because the endpoint requires the cron secret."
      >
        <RefreshCw className="size-3.5" />
        Cron-only poll
      </Button>
    </div>
  );
}
