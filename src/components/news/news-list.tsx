"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatRelativeTime } from "@/lib/system-prompt";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { MonitoredSourceRow, SignalRow } from "@/lib/db/types";

export type NewsSignal = SignalRow & {
  sourceHandle: string | null;
};

type Props = {
  initialSources: MonitoredSourceRow[];
  initialSignals: NewsSignal[];
  initialTotalCount: number;
  pageSize: number;
  userId: string;
};

const SOURCES_COLLAPSED_KEY = "news:sources-collapsed";

export function NewsList({
  initialSources,
  initialSignals,
  initialTotalCount,
  pageSize,
  userId,
}: Props) {
  const router = useRouter();
  const [sources, setSources] = useState(initialSources);
  const [signals, setSignals] = useState<NewsSignal[]>(initialSignals);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [feedUrl, setFeedUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const [sourcesCollapsed, setSourcesCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SOURCES_COLLAPSED_KEY) === "1";
  });
  const [, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const hasMore = !exhausted && signals.length < totalCount;

  const sourceHandleMap = useMemo(
    () => new Map(sources.map((s) => [s.id, s.handle])),
    [sources],
  );

  const toggleSourcesCollapsed = useCallback(() => {
    setSourcesCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(SOURCES_COLLAPSED_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  // Realtime subscribe to signal inserts/updates/deletes for this user.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`signals-rail:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "signals",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as SignalRow;
          if (row.status === "dismissed") return;
          setSignals((current) => {
            if (current.some((s) => s.id === row.id)) return current;
            return [
              { ...row, sourceHandle: sourceHandleMap.get(row.source_id) ?? null },
              ...current,
            ];
          });
          setTotalCount((c) => c + 1);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "signals",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as SignalRow;
          setSignals((current) => {
            const exists = current.some((s) => s.id === row.id);
            if (row.status === "dismissed") {
              return exists ? current.filter((s) => s.id !== row.id) : current;
            }
            if (!exists) {
              return [
                {
                  ...row,
                  sourceHandle: sourceHandleMap.get(row.source_id) ?? null,
                },
                ...current,
              ];
            }
            return current.map((s) =>
              s.id === row.id
                ? {
                    ...row,
                    sourceHandle:
                      sourceHandleMap.get(row.source_id) ?? s.sourceHandle,
                  }
                : s,
            );
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "signals",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.old as Partial<SignalRow>;
          if (!row.id) return;
          setSignals((current) => current.filter((s) => s.id !== row.id));
          setTotalCount((c) => Math.max(0, c - 1));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, sourceHandleMap]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    const oldest = signals[signals.length - 1];
    if (!oldest) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({
        limit: String(pageSize),
        status_not: "dismissed",
        with_source_handle: "1",
        posted_before: oldest.posted_at,
      });
      const res = await fetch(`/api/signals?${params}`);
      if (!res.ok) {
        toast.error("Could not load more signals.");
        return;
      }
      const next = (await res.json()) as NewsSignal[];
      if (next.length === 0) {
        setExhausted(true);
        return;
      }
      setSignals((current) => {
        const seen = new Set(current.map((s) => s.id));
        const merged = [...current];
        for (const row of next) {
          if (!seen.has(row.id)) merged.push(row);
        }
        return merged;
      });
      if (next.length < pageSize) setExhausted(true);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, pageSize, signals]);

  // IntersectionObserver for infinite scroll.
  useEffect(() => {
    if (!hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMore();
      },
      { rootMargin: "120px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  async function addFeed(e: React.FormEvent) {
    e.preventDefault();
    const url = feedUrl.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      toast.error("Paste a full feed URL (https://...)");
      return;
    }
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
      toast.success("Feed added");
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
      const errors = (payload?.errors as string[] | undefined) ?? [];
      if (errors.length > 0) {
        toast.warning(
          `Scan finished with ${errors.length} feed error${errors.length === 1 ? "" : "s"}.`,
        );
      } else {
        toast.success(
          inserted > 0
            ? `Scan done. ${inserted} new signal${inserted === 1 ? "" : "s"}.`
            : "Scan done. No new signals.",
        );
      }
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
    setSignals((current) => current.filter((s) => s.id !== id));
    setTotalCount((c) => Math.max(0, c - 1));
  }

  const allPolled = sources.length > 0 && sources.every((s) => s.last_polled_at);
  const lastPollAcrossAll = sources.reduce<string | null>((acc, s) => {
    if (!s.last_polled_at) return acc;
    if (!acc) return s.last_polled_at;
    return new Date(s.last_polled_at) > new Date(acc) ? s.last_polled_at : acc;
  }, null);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-col gap-2 border-b p-3">
        <form onSubmit={addFeed} className="flex gap-2">
          <Input
            type="url"
            value={feedUrl}
            onChange={(e) => setFeedUrl(e.target.value)}
            placeholder="https://example.com/feed.xml"
            className="h-8 text-sm"
            maxLength={500}
            required
          />
          <Button
            type="submit"
            size="icon-sm"
            disabled={adding || !feedUrl.trim()}
            aria-label="Add feed"
          >
            <Plus className="size-4" />
          </Button>
        </form>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">
            {sources.length} feed{sources.length === 1 ? "" : "s"}
            {allPolled && lastPollAcrossAll && (
              <> · all polled {formatRelativeTime(lastPollAcrossAll)}</>
            )}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void scanNow()}
            disabled={scanning || sources.length === 0}
            className="h-7 text-xs"
          >
            <RefreshCw className={cn("size-3", scanning && "animate-spin")} />
            {scanning ? "Scanning" : "Scan now"}
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {sources.length === 0 ? (
          <p className="px-2 py-4 text-xs text-muted-foreground">
            No feeds yet. Paste an RSS URL above to start collecting signals.
          </p>
        ) : (
          <>
            <button
              type="button"
              onClick={toggleSourcesCollapsed}
              className="mb-2 flex w-full items-center gap-1.5 rounded px-1 py-1 text-[10px] uppercase tracking-wide text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-expanded={!sourcesCollapsed}
            >
              {sourcesCollapsed ? (
                <ChevronRight className="size-3" />
              ) : (
                <ChevronDown className="size-3" />
              )}
              Sources
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] normal-case tracking-normal">
                {sources.length}
              </span>
            </button>

            {!sourcesCollapsed && (
              <ul className="mb-3 flex flex-col gap-1">
                {sources.map((source) => (
                  <li
                    key={source.id}
                    className="group flex items-center gap-2 rounded-md border bg-background px-2 py-1.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">
                        {source.handle}
                      </p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {source.last_polled_at
                          ? `last poll ${formatRelativeTime(source.last_polled_at)}`
                          : "never polled"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => void removeFeed(source.id)}
                      aria-label={`Remove ${source.handle}`}
                      className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mb-2 flex items-center gap-2 px-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              Recent signals
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] normal-case tracking-normal">
                {totalCount}
              </span>
            </div>

            {signals.length === 0 ? (
              <p className="px-2 py-3 text-xs text-muted-foreground">
                No signals yet. Click Scan now or wait for the daily poll.
              </p>
            ) : (
              <>
                <ul className="flex flex-col gap-1.5">
                  {signals.map((signal) => {
                    const text =
                      signal.summary ||
                      (typeof signal.raw.text === "string"
                        ? (signal.raw.text as string).trim()
                        : signal.url);
                    const score = signal.relevance_score ?? 0;
                    return (
                      <li key={signal.id}>
                        <div className="rounded-md border bg-background p-2">
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <span className="truncate font-medium text-foreground">
                              {signal.sourceHandle ?? "feed"}
                            </span>
                            <span>·</span>
                            <span>{formatRelativeTime(signal.posted_at)}</span>
                            <span
                              className={cn(
                                "ml-auto rounded-full bg-muted px-1.5 py-0.5 font-mono",
                                score >= 0.75 && "bg-primary/10 text-primary",
                              )}
                            >
                              {score.toFixed(2)}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-foreground">
                            {text}
                          </p>
                          <div className="mt-1.5 flex items-center justify-end gap-1">
                            <a
                              href={signal.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              <ExternalLink className="size-3" />
                              Open
                            </a>
                            <button
                              type="button"
                              onClick={() => void dismissSignal(signal.id)}
                              className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              aria-label="Dismiss signal"
                            >
                              <X className="size-3" />
                              Dismiss
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {hasMore && (
                  <div
                    ref={sentinelRef}
                    className="flex justify-center py-3"
                    aria-live="polite"
                  >
                    <Loader2
                      className="size-4 animate-spin text-muted-foreground"
                      aria-label={loadingMore ? "Loading more" : "Load more"}
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
