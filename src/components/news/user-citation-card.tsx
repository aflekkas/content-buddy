"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2, Quote } from "lucide-react";
import { formatRelativeTime } from "@/lib/system-prompt";
import { cn } from "@/lib/utils";
import type { SignalRow } from "@/lib/db/types";

type Fetched = SignalRow & { sourceHandle: string | null };

const cache = new Map<string, Fetched | "missing">();

export function UserCitationCard({ signalId }: { signalId: string }) {
  const [data, setData] = useState<Fetched | "missing" | null>(
    () => cache.get(signalId) ?? null,
  );

  useEffect(() => {
    if (data !== null) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/signals/${signalId}`);
        if (!res.ok) {
          cache.set(signalId, "missing");
          if (!cancelled) setData("missing");
          return;
        }
        const row = (await res.json()) as Fetched;
        cache.set(signalId, row);
        if (!cancelled) setData(row);
      } catch {
        cache.set(signalId, "missing");
        if (!cancelled) setData("missing");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signalId, data]);

  if (data === null) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-[10px] text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Loading citation…
      </div>
    );
  }

  if (data === "missing") {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-[10px] text-muted-foreground">
        <Quote className="size-3" />
        Citation unavailable
      </div>
    );
  }

  const handle = data.sourceHandle ?? "feed";
  const text =
    data.summary ||
    (typeof data.raw?.text === "string"
      ? (data.raw.text as string).trim()
      : data.url);
  const score = data.relevance_score ?? 0;
  return (
    <div className="rounded-md border bg-background p-2 text-foreground">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Quote className="size-3" />
        <span className="truncate font-medium text-foreground">{handle}</span>
        <span>·</span>
        <span>{formatRelativeTime(data.posted_at)}</span>
        <span
          className={cn(
            "ml-auto rounded-full bg-muted px-1.5 py-0.5 font-mono",
            score >= 0.75 && "bg-primary/10 text-primary",
          )}
        >
          {score.toFixed(2)}
        </span>
      </div>
      <p className="mt-1 line-clamp-3 text-xs leading-relaxed">{text}</p>
      <div className="mt-1.5 flex items-center justify-end">
        <a
          href={data.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ExternalLink className="size-3" />
          Open
        </a>
      </div>
    </div>
  );
}

export function extractSignalIds(text: string): {
  ids: string[];
  cleanText: string;
} {
  const re = /\[signal:([0-9a-fA-F-]{8,})\]/g;
  const ids: string[] = [];
  const cleanText = text
    .replace(re, (_m, id) => {
      ids.push(id);
      return "";
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { ids, cleanText };
}
