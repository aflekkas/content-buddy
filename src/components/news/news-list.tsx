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
import { motion } from "motion/react";
import {
  Brain,
  Check,
  ChevronRight,
  Copy,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatRelativeTime } from "@/lib/system-prompt";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { NewsSignalCard } from "@/components/news/news-signal-card";
import { citeSignal } from "@/lib/cite-signal";
import type { MonitoredSourceRow, SignalRow } from "@/lib/db/types";
import type { ScanEvent } from "@/app/api/cron/poll-sources/route";

export type NewsSignal = SignalRow & {
  sourceHandle: string | null;
};

type ConsoleLine = {
  id: number;
  text: string;
  tone: "info" | "muted" | "success" | "warn" | "error";
};

type Props = {
  initialSources: MonitoredSourceRow[];
  initialSignals: NewsSignal[];
  initialTotalCount: number;
  pageSize: number;
  userId: string;
};

const SOURCES_COLLAPSED_KEY = "news:sources-collapsed";
const SIGNALS_COLLAPSED_KEY = "news:signals-collapsed";

// Apple-style ease-out: standard "decelerate" curve, smooth on collapse/expand.
const COLLAPSE_TRANSITION = {
  duration: 0.34,
  ease: [0.32, 0.72, 0, 1] as [number, number, number, number],
};
const COLLAPSE_DURATION_MS = 340;
const COLLAPSE_TIMING = "cubic-bezier(0.32, 0.72, 0, 1)";
const MONO_FONT_STACK =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

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
  const [sourcesCollapsed, setSourcesCollapsed] = useState(false);
  const [signalsCollapsed, setSignalsCollapsed] = useState(false);
  const [consoleVisible, setConsoleVisible] = useState(false);
  const [pendingDelete, setPendingDelete] =
    useState<MonitoredSourceRow | null>(null);
  const [consoleLines, setConsoleLines] = useState<ConsoleLine[]>([]);
  const [consoleCopied, setConsoleCopied] = useState(false);
  const [, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const consoleScrollRef = useRef<HTMLDivElement | null>(null);
  const consoleLineIdRef = useRef(0);
  const railScrollRef = useRef<HTMLDivElement | null>(null);
  const wasConsoleVisibleRef = useRef(false);

  useEffect(() => {
    try {
      const nextSourcesCollapsed =
        window.localStorage.getItem(SOURCES_COLLAPSED_KEY) === "1";
      const nextSignalsCollapsed =
        window.localStorage.getItem(SIGNALS_COLLAPSED_KEY) === "1";
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration sync from localStorage
      setSourcesCollapsed(nextSourcesCollapsed);
      setSignalsCollapsed(nextSignalsCollapsed);
    } catch {}
  }, []);

  useEffect(() => {
    if (consoleVisible && !wasConsoleVisibleRef.current) {
      const node = railScrollRef.current;
      if (node) node.scrollTo({ top: 0, behavior: "smooth" });
    }
    wasConsoleVisibleRef.current = consoleVisible;
  }, [consoleVisible]);

  const hasMore = !exhausted && signals.length < totalCount;

  const sourceHandleMap = useMemo(
    () => new Map(sources.map((s) => [s.id, s.handle])),
    [sources],
  );

  const consoleText = useMemo(
    () => consoleLines.map((l) => l.text).join("\n"),
    [consoleLines],
  );

  const toggleSourcesCollapsed = useCallback(() => {
    setSourcesCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(SOURCES_COLLAPSED_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  const toggleSignalsCollapsed = useCallback(() => {
    setSignalsCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(SIGNALS_COLLAPSED_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  const copyConsole = useCallback(async () => {
    if (!consoleText) return;
    try {
      await navigator.clipboard.writeText(consoleText);
      setConsoleCopied(true);
      setTimeout(() => setConsoleCopied(false), 1400);
    } catch {
      toast.error("Could not copy console.");
    }
  }, [consoleText]);

  const sendConsoleToChat = useCallback(() => {
    if (!consoleText) {
      toast.error("Nothing in the console yet.");
      return;
    }
    const wrapped = `Here is the latest news scan output. Help me make sense of it:\n\n\`\`\`\n${consoleText}\n\`\`\``;
    window.dispatchEvent(
      new CustomEvent("chat:input-paste", {
        detail: { text: wrapped, append: true },
      }),
    );
    toast.success("Pasted into chat");
  }, [consoleText]);

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

  const pushConsole = useCallback(
    (text: string, tone: ConsoleLine["tone"] = "info") => {
      const id = ++consoleLineIdRef.current;
      setConsoleLines((current) => {
        const next = [...current, { id, text, tone }];
        return next.length > 200 ? next.slice(next.length - 200) : next;
      });
    },
    [],
  );

  useEffect(() => {
    if (!consoleVisible) return;
    const node = consoleScrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [consoleLines, consoleVisible]);

  function formatEvent(event: ScanEvent): ConsoleLine | null {
    switch (event.type) {
      case "start":
        return {
          id: 0,
          text: `> scanning ${event.sources} source${event.sources === 1 ? "" : "s"}`,
          tone: "info",
        };
      case "source_skip":
        return {
          id: 0,
          text: `- skip ${event.handle} (${event.reason === "not_due" ? "not due" : "no fetcher"})`,
          tone: "muted",
        };
      case "fetch_start":
        return { id: 0, text: `… fetch ${event.handle}`, tone: "info" };
      case "fetch_done":
        return {
          id: 0,
          text: `+ ${event.handle}: ${event.fetched} fetched, ${event.inserted} new`,
          tone: event.inserted > 0 ? "success" : "muted",
        };
      case "score_done":
        return {
          id: 0,
          text: `~ ${event.handle}: scored ${event.score.toFixed(2)} ${event.summary.slice(0, 60)}`,
          tone: "muted",
        };
      case "source_done":
        return { id: 0, text: `✓ ${event.handle} done`, tone: "success" };
      case "source_error":
        return {
          id: 0,
          text: `! ${event.handle}: ${event.message}`,
          tone: "error",
        };
      case "user_error":
        return { id: 0, text: `! ${event.message}`, tone: "error" };
      case "summary":
        return null;
    }
  }

  async function scanNow() {
    setScanning(true);
    setConsoleLines([]);
    setConsoleVisible(true);
    try {
      const res = await fetch(
        `/api/cron/poll-sources?user_id=${userId}&stream=1`,
        { method: "POST" },
      );
      if (!res.ok || !res.body) {
        const payload = await res.json().catch(() => null);
        toast.error(payload?.message ?? "Scan failed.");
        pushConsole(`! scan failed (${res.status})`, "error");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let summary: {
        sources_polled: number;
        signals_inserted: number;
        errors: string[];
      } | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n");
        buffer = parts.pop() ?? "";
        for (const line of parts) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const event = JSON.parse(trimmed) as ScanEvent;
            if (event.type === "summary") {
              summary = event.summary;
            } else {
              const formatted = formatEvent(event);
              if (formatted) pushConsole(formatted.text, formatted.tone);
            }
          } catch {
            pushConsole(trimmed, "muted");
          }
        }
      }

      if (summary) {
        const { sources_polled, signals_inserted, errors } = summary;
        pushConsole(
          `= done · ${sources_polled} feed${sources_polled === 1 ? "" : "s"} polled · ${signals_inserted} new signal${signals_inserted === 1 ? "" : "s"}${errors.length > 0 ? ` · ${errors.length} error${errors.length === 1 ? "" : "s"}` : ""}`,
          errors.length > 0 ? "warn" : "success",
        );
        if (errors.length > 0) {
          toast.warning(
            `Scan finished with ${errors.length} feed error${errors.length === 1 ? "" : "s"}.`,
          );
        } else {
          toast.success(
            signals_inserted > 0
              ? `Scan done. ${signals_inserted} new signal${signals_inserted === 1 ? "" : "s"}.`
              : "Scan done. No new signals.",
          );
        }
      }
      startTransition(() => router.refresh());
    } catch (error) {
      const message = error instanceof Error ? error.message : "scan crashed";
      pushConsole(`! ${message}`, "error");
      toast.error(message);
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
        <div
          className={cn(
            "overflow-hidden transition-[max-height,opacity,margin] ease-out",
            consoleVisible
              ? "mt-1 max-h-52 opacity-100"
              : "mt-0 max-h-0 opacity-0",
          )}
          style={{ transitionDuration: `${COLLAPSE_DURATION_MS}ms` }}
          aria-live="polite"
        >
          <div className="overflow-hidden rounded-lg border bg-muted/40 shadow-sm">
            <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-background/40 px-3 py-1.5">
              <span
                className="text-[10px] uppercase tracking-wide text-muted-foreground"
                style={{ fontFamily: MONO_FONT_STACK }}
              >
                scan console
              </span>
              <div className="flex items-center gap-0.5">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        onClick={sendConsoleToChat}
                        className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                        aria-label="Send console to chat"
                        disabled={consoleLines.length === 0}
                      >
                        <Brain className="size-3" />
                      </button>
                    }
                  />
                  <TooltipContent side="bottom">Send to chat</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        onClick={() => void copyConsole()}
                        className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                        aria-label="Copy console output"
                        disabled={consoleLines.length === 0}
                      >
                        {consoleCopied ? (
                          <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </button>
                    }
                  />
                  <TooltipContent side="bottom">
                    {consoleCopied ? "Copied" : "Copy"}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        onClick={() => setConsoleVisible(false)}
                        className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label="Hide scan console"
                      >
                        <X className="size-3" />
                      </button>
                    }
                  />
                  <TooltipContent side="bottom">Close</TooltipContent>
                </Tooltip>
              </div>
            </div>
            <div
              ref={consoleScrollRef}
              className="max-h-32 overflow-y-auto bg-background/20 px-3 py-2 text-[10.5px] leading-snug"
              style={{ fontFamily: MONO_FONT_STACK }}
            >
              {consoleLines.map((line) => (
                <div
                  key={line.id}
                  className={cn(
                    "whitespace-pre-wrap break-words",
                    line.tone === "info" && "text-foreground",
                    line.tone === "muted" && "text-muted-foreground",
                    line.tone === "success" && "text-emerald-600 dark:text-emerald-400",
                    line.tone === "warn" && "text-amber-600 dark:text-amber-400",
                    line.tone === "error" && "text-red-600 dark:text-red-400",
                  )}
                >
                  {line.text}
                </div>
              ))}
              {scanning && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" />
                  running…
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      <div ref={railScrollRef} className="min-h-0 flex-1 overflow-y-auto">
        {sources.length === 0 ? (
          <p className="px-3 py-4 text-xs text-muted-foreground">
            No feeds yet. Paste an RSS URL above to start collecting signals.
          </p>
        ) : (
          <>
            <section className="border-b">
              <button
                type="button"
                onClick={toggleSourcesCollapsed}
                className="flex w-full select-none items-center gap-1.5 px-3 py-2 text-[10px] uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
                aria-expanded={!sourcesCollapsed}
              >
                <motion.span
                  animate={{ rotate: sourcesCollapsed ? 0 : 90 }}
                  transition={COLLAPSE_TRANSITION}
                  className="flex"
                >
                  <ChevronRight className="size-3" />
                </motion.span>
                Sources
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] normal-case tracking-normal">
                  {sources.length}
                </span>
              </button>
              <div
                className="grid"
                style={{
                  gridTemplateRows: sourcesCollapsed ? "0fr" : "1fr",
                  opacity: sourcesCollapsed ? 0 : 1,
                  transition: `grid-template-rows ${COLLAPSE_DURATION_MS}ms ${COLLAPSE_TIMING}, opacity ${COLLAPSE_DURATION_MS}ms ${COLLAPSE_TIMING}`,
                }}
                aria-hidden={sourcesCollapsed}
              >
                <div className="overflow-hidden">
                  <ul className="flex flex-col gap-1 px-2 pb-2">
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
                          onClick={() => setPendingDelete(source)}
                          aria-label={`Remove ${source.handle}`}
                          className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <button
                type="button"
                onClick={toggleSignalsCollapsed}
                className="flex w-full select-none items-center gap-1.5 px-3 py-2 text-[10px] uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
                aria-expanded={!signalsCollapsed}
              >
                <motion.span
                  animate={{ rotate: signalsCollapsed ? 0 : 90 }}
                  transition={COLLAPSE_TRANSITION}
                  className="flex"
                >
                  <ChevronRight className="size-3" />
                </motion.span>
                Recent signals
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] normal-case tracking-normal">
                  {totalCount}
                </span>
              </button>
              <div
                className="grid"
                style={{
                  gridTemplateRows: signalsCollapsed ? "0fr" : "1fr",
                  opacity: signalsCollapsed ? 0 : 1,
                  transition: `grid-template-rows ${COLLAPSE_DURATION_MS}ms ${COLLAPSE_TIMING}, opacity ${COLLAPSE_DURATION_MS}ms ${COLLAPSE_TIMING}`,
                }}
                aria-hidden={signalsCollapsed}
              >
                <div className="overflow-hidden">
                  <div className="px-2 pb-2">
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
                            return (
                              <li key={signal.id}>
                                <NewsSignalCard
                                  variant="rail"
                                  signal={{
                                    id: signal.id,
                                    source: signal.sourceHandle ?? null,
                                    posted_at: signal.posted_at,
                                    text,
                                    url: signal.url,
                                    relevance_score: signal.relevance_score,
                                  }}
                                  onDismiss={(id) => void dismissSignal(id)}
                                  onCite={citeSignal}
                                />
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
                              aria-label={
                                loadingMore ? "Loading more" : "Load more"
                              }
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Remove feed?"
        description={
          pendingDelete
            ? `${pendingDelete.handle} will stop polling. Past signals stay.`
            : undefined
        }
        confirmLabel="Remove"
        onConfirm={async () => {
          if (pendingDelete) await removeFeed(pendingDelete.id);
        }}
      />
    </div>
  );
}
