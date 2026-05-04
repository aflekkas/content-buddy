"use client";

import Link from "next/link";
import { ExternalLink, FileText, Quote, X } from "lucide-react";
import { formatRelativeTime } from "@/lib/system-prompt";
import { cn } from "@/lib/utils";
import type { PostType } from "@/lib/db/types";

export type DraftCardData = {
  id: string;
  body: string;
  post_type: PostType | null;
  updated_at: string | null;
};

type Props = {
  draft: DraftCardData;
  variant?: "rail" | "chat";
  onCite?: (draft: DraftCardData) => void;
  onDismiss?: (id: string) => void;
};

export function DraftCard({ draft, variant = "chat", onCite, onDismiss }: Props) {
  const href = `/dashboard/drafts/${draft.id}`;
  const body = draft.body.trim();
  const preview = body.length > 0 ? body : "(empty draft)";
  return (
    <Link
      href={href}
      className={cn(
        "block rounded-md border bg-background p-2 text-foreground transition-colors",
        "cursor-pointer hover:border-primary/40 hover:bg-muted/40",
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <FileText className="size-3" />
        <span className="truncate font-medium text-foreground">Draft</span>
        {draft.post_type ? (
          <>
            <span>·</span>
            <span className="capitalize">{draft.post_type.replace(/_/g, " ")}</span>
          </>
        ) : null}
        {draft.updated_at ? (
          <>
            <span>·</span>
            <span>{formatRelativeTime(draft.updated_at)}</span>
          </>
        ) : null}
      </div>
      <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs leading-relaxed text-foreground">
        {preview}
      </p>
      <div className="mt-1.5 flex items-center justify-end gap-1">
        {onCite ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCite(draft);
            }}
            className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Reference draft in chat"
          >
            <Quote className="size-3" />
            Cite
          </button>
        ) : null}
        <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground">
          <ExternalLink className="size-3" />
          Open
        </span>
        {variant === "rail" && onDismiss ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDismiss(draft.id);
            }}
            className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="Dismiss draft"
          >
            <X className="size-3" />
            Dismiss
          </button>
        ) : null}
      </div>
    </Link>
  );
}
