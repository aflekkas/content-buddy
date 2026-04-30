"use client";

import { FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/system-prompt";
import { cn } from "@/lib/utils";

export type FeedSignal = {
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
  signal: FeedSignal;
  onDraft: (signalId: string) => void;
  onDismiss: (signalId: string) => void;
  busy?: boolean;
};

export function SignalCard({ signal, onDraft, onDismiss, busy }: Props) {
  const handle = normalizeHandle(signal.sourceHandle);
  const text = signal.summary || readSignalText(signal);
  const score = signal.relevance_score ?? 0;

  return (
    <Card className="rounded-2xl border bg-background p-4 shadow-sm ring-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{handle}</span>
            <span>{formatRelativeTime(signal.posted_at)}</span>
            <span
              className={cn(
                "rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] text-foreground",
                score >= 0.75 && "bg-primary/10 text-primary",
              )}
            >
              {score.toFixed(2)}
            </span>
          </div>
          <p className="mt-3 line-clamp-4 text-sm leading-6 text-foreground">
            {text}
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onDismiss(signal.id)}
          disabled={busy}
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="size-3.5" />
          Dismiss
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => onDraft(signal.id)}
          disabled={busy}
        >
          <FileText className="size-3.5" />
          Draft
        </Button>
      </div>
    </Card>
  );
}

function normalizeHandle(handle: string | null) {
  if (!handle) return "@unknown";
  return handle.startsWith("@") ? handle : `@${handle}`;
}

function readSignalText(signal: FeedSignal) {
  const rawText = signal.raw.text;
  if (typeof rawText === "string" && rawText.trim()) return rawText.trim();
  return signal.url;
}
