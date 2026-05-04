"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import type { DraftRow } from "@/lib/db/types";
import { DraftCard, type DraftCardData } from "./draft-card";

const cache = new Map<string, DraftRow | "missing">();

export function UserDraftCard({ draftId }: { draftId: string }) {
  const [data, setData] = useState<DraftRow | "missing" | null>(
    () => cache.get(draftId) ?? null,
  );

  useEffect(() => {
    if (data !== null) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/drafts/${draftId}`);
        if (!res.ok) {
          cache.set(draftId, "missing");
          if (!cancelled) setData("missing");
          return;
        }
        const row = (await res.json()) as DraftRow;
        cache.set(draftId, row);
        if (!cancelled) setData(row);
      } catch {
        cache.set(draftId, "missing");
        if (!cancelled) setData("missing");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [draftId, data]);

  if (data === null) {
    return (
      <div
        className="rounded-md border bg-background p-2"
        aria-label="Loading draft"
        aria-busy="true"
      >
        <div className="flex items-center gap-1.5">
          <FileText className="size-3 text-muted-foreground/50" />
          <div className="h-2.5 w-16 animate-pulse rounded bg-muted" />
        </div>
        <div className="mt-2 space-y-1.5">
          <div className="h-2.5 w-full animate-pulse rounded bg-muted" />
          <div className="h-2.5 w-5/6 animate-pulse rounded bg-muted" />
        </div>
        <div className="mt-2 flex justify-end">
          <div className="h-3 w-10 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (data === "missing") {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-[10px] text-muted-foreground">
        <FileText className="size-3" />
        Draft unavailable
      </div>
    );
  }

  const cardData: DraftCardData = {
    id: data.id,
    body: data.body,
    post_type: data.post_type,
    updated_at: data.updated_at,
  };
  return <DraftCard draft={cardData} variant="chat" />;
}

export function extractDraftIds(text: string): {
  ids: string[];
  cleanText: string;
} {
  const re = /\[draft:([0-9a-fA-F-]{8,})\]/g;
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
