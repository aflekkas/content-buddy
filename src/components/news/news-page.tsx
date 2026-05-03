"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw, Trash2, Newspaper } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatRelativeTime } from "@/lib/system-prompt";
import { cn } from "@/lib/utils";
import type { MonitoredSourceRow } from "@/lib/db/types";

export type NewsSignal = {
  id: string;
  source_id: string;
  url: string;
  posted_at: string;
  raw: Record<string, unknown>;
  summary: string | null;
  relevance_score: number | null;
  status: "new" | "queued" | "drafted" | "dismissed";
  sourceHandle: string | null;
};

type Props = {
  initialSources: MonitoredSourceRow[];
  initialSignals: NewsSignal[];
  userId: string;
};

export function NewsPage({ initialSources, initialSignals, userId }: Props) {
  const router = useRouter();
  const [sources, setSources] = useState(initialSources);
  const [signals, setSignals] = useState(initialSignals);
  const [feedUrl, setFeedUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [, startTransition] = useTransition();

  async function addFeed(e: React.FormEvent) {
    e.preventDefault();
    const url = feedUrl.trim();
    if (!url) return;
    setAdding(true);
    try {
      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "rss_feed", url }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        const reason =
          payload?.failures?.[0]?.reason ?? payload?.message ?? "Could not add feed.";
        toast.error(reason);
        return;
      }
      setSources((current) => [payload as MonitoredSourceRow, ...current]);
      setFeedUrl("");
      toast.success("Feed added.");
    } finally {
      setAdding(false);
    }
  }

  async function removeFeed(id: string) {
    const res = await fetch(`/api/sources/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not remove feed.");
      return;
    }
    setSources((current) => current.filter((s) => s.id !== id));
  }

  async function scanNow() {
    setScanning(true);
    try {
      const res = await fetch(`/api/cron/poll-sources?user_id=${userId}`, {
        method: "POST",
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(payload?.message ?? "Scan failed.");
        return;
      }
      const inserted = payload?.signals_inserted ?? 0;
      toast.success(
        inserted > 0
          ? `Scan complete. ${inserted} new signal${inserted === 1 ? "" : "s"}.`
          : "Scan complete. No new signals.",
      );
      startTransition(() => router.refresh());
    } finally {
      setScanning(false);
    }
  }

  async function dismissSignal(id: string) {
    const res = await fetch(`/api/signals/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "dismissed" }),
    });
    if (!res.ok) return;
    setSignals((current) =>
      current.map((s) => (s.id === id ? { ...s, status: "dismissed" } : s)),
    );
  }

  const visibleSignals = signals.filter((s) => s.status !== "dismissed");

  return (
    <main className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">News</h1>
          <p className="text-sm text-muted-foreground">
            Add RSS feeds. The agent uses these as source material when you ask
            it to scan news or draft from current items.
          </p>
        </header>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">RSS feeds</h2>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void scanNow()}
              disabled={scanning || sources.length === 0}
            >
              <RefreshCw
                className={cn("size-3.5", scanning && "animate-spin")}
              />
              {scanning ? "Scanning" : "Scan now"}
            </Button>
          </div>

          <form onSubmit={addFeed} className="flex gap-2">
            <Input
              type="url"
              value={feedUrl}
              onChange={(e) => setFeedUrl(e.target.value)}
              placeholder="https://example.com/feed.xml"
              maxLength={500}
              required
            />
            <Button type="submit" disabled={adding || !feedUrl.trim()}>
              <Plus className="size-4" /> Add feed
            </Button>
          </form>

          {sources.length === 0 ? (
            <p className="rounded-md border border-dashed bg-background p-4 text-center text-xs text-muted-foreground">
              No feeds yet. Add an RSS URL to start collecting signals.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {sources.map((source) => (
                <li
                  key={source.id}
                  className="flex items-center gap-3 rounded-md border bg-background px-3 py-2"
                >
                  <Newspaper className="size-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {source.handle}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {source.url}
                    </p>
                  </div>
                  {source.last_polled_at && (
                    <span className="hidden shrink-0 text-[10px] text-muted-foreground/70 sm:inline">
                      last poll {formatRelativeTime(source.last_polled_at)}
                    </span>
                  )}
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => void removeFeed(source.id)}
                    aria-label="Remove feed"
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-foreground">Recent signals</h2>
          {visibleSignals.length === 0 ? (
            <p className="rounded-2xl border bg-background p-8 text-center text-sm text-muted-foreground">
              {sources.length === 0
                ? "Add an RSS feed above to start collecting signals."
                : "No signals yet. Click Scan now or wait for the daily poll."}
            </p>
          ) : (
            <div className="grid gap-3">
              {visibleSignals.map((signal) => (
                <NewsSignalCard
                  key={signal.id}
                  signal={signal}
                  onDismiss={() => void dismissSignal(signal.id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function NewsSignalCard({
  signal,
  onDismiss,
}: {
  signal: NewsSignal;
  onDismiss: () => void;
}) {
  const text = signal.summary || readSignalText(signal);
  const score = signal.relevance_score ?? 0;
  return (
    <Card className="rounded-2xl border bg-background p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          {signal.sourceHandle ?? "feed"}
        </span>
        <span>{formatRelativeTime(signal.posted_at)}</span>
        <span
          className={cn(
            "rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] text-foreground",
            score >= 0.75 && "bg-primary/10 text-primary",
          )}
        >
          {score.toFixed(2)}
        </span>
        <a
          href={signal.url}
          target="_blank"
          rel="noreferrer"
          className="ml-auto text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          open
        </a>
      </div>
      <p className="mt-3 line-clamp-4 text-sm leading-6 text-foreground">
        {text}
      </p>
      <div className="mt-3 flex items-center justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          Dismiss
        </Button>
      </div>
    </Card>
  );
}

function readSignalText(signal: NewsSignal) {
  const rawText = signal.raw.text;
  if (typeof rawText === "string" && rawText.trim()) return rawText.trim();
  return signal.url;
}
