"use client";

import Link from "next/link";
import { FilePenLine, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/system-prompt";
import { cn } from "@/lib/utils";

export type FeedDraft = {
  id: string;
  signal_ids: string[];
  body: string;
  status: "draft" | "copied" | "dismissed";
  created_at: string;
  sourceHandles: string[];
};

type Props = {
  draft: FeedDraft;
  onDismiss: (draftId: string) => void;
  busy?: boolean;
};

export function DraftCard({ draft, onDismiss, busy }: Props) {
  return (
    <Card className="rounded-2xl border bg-background p-4 shadow-sm ring-0">
      <Link
        href={`/dashboard/drafts/${draft.id}`}
        className="block rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-muted px-2 py-0.5 text-foreground">
            {draft.status}
          </span>
          <span>{formatRelativeTime(draft.created_at)}</span>
          {draft.sourceHandles.length > 0 && (
            <span className="truncate">
              {draft.sourceHandles.map(normalizeHandle).join(", ")}
            </span>
          )}
        </div>
        <div className="relative mt-3 max-h-[4.75rem] overflow-hidden">
          <p className="line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-foreground">
            {draft.body}
          </p>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-background to-transparent" />
        </div>
      </Link>
      <div className="mt-4 flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onDismiss(draft.id)}
          disabled={busy}
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="size-3.5" />
          Dismiss
        </Button>
        <Link
          href={`/dashboard/drafts/${draft.id}`}
          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
        >
          <FilePenLine className="size-3.5" />
          Edit
        </Link>
      </div>
    </Card>
  );
}

function normalizeHandle(handle: string) {
  return handle.startsWith("@") ? handle : `@${handle}`;
}
