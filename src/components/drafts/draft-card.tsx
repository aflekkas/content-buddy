"use client";

import { ExternalLink, FileText, Quote } from "lucide-react";
import { useActiveDrafts } from "@/components/cockpit/active-drafts-context";
import { formatRelativeTime } from "@/lib/system-prompt";
import { cn } from "@/lib/utils";
import type { DraftRow, PostType } from "@/lib/db/types";

export type DraftCardData = {
  id: string;
  body: string;
  post_type: PostType | null;
  updated_at: string | null;
};

export type EmbeddedDraftData = DraftRow;

type Props = {
  draft: DraftCardData;
  cacheDraft?: DraftRow;
  onCite?: (draft: DraftCardData) => void;
};

export function DraftCard({
  draft,
  cacheDraft,
  onCite,
}: Props) {
  const { openDraft } = useActiveDrafts();
  const body = draft.body.trim();
  const preview = body.length > 0 ? body : "(empty draft)";
  const handleOpen = () => openDraft(draft.id, cacheDraft);

  return (
    <div
      className={cn(
        "rounded-md border bg-background text-foreground transition-colors duration-200 ease-out",
        "hover:border-primary/40 hover:bg-muted/40",
      )}
    >
      <button
        type="button"
        onClick={handleOpen}
        className="block w-full p-2 text-left"
      >
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <FileText className="size-3" />
          <span className="truncate font-medium text-foreground">Draft</span>
          {draft.post_type ? (
            <>
              <span>·</span>
              <span className="capitalize">
                {draft.post_type.replace(/_/g, " ")}
              </span>
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
      </button>
      <div className="flex items-center justify-end gap-1 px-2 pb-2">
        {onCite ? (
          <button
            type="button"
            onClick={() => onCite(draft)}
            className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors duration-200 ease-out hover:bg-muted hover:text-foreground"
            aria-label="Reference draft in chat"
          >
            <Quote className="size-3" />
            Cite
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleOpen}
          className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors duration-200 ease-out hover:bg-muted hover:text-foreground"
        >
          <ExternalLink className="size-3" />
          Open
        </button>
      </div>
    </div>
  );
}

export function EmbeddedDraftCard({ draft }: { draft: EmbeddedDraftData }) {
  const { openDraft } = useActiveDrafts();
  const body = draft.body.trim() || "(empty draft)";
  const timestamp = draft.updated_at ?? draft.created_at ?? null;
  const handleOpen = () => openDraft(draft.id, draft);

  return (
    <div
      className={cn(
        "rounded-md border bg-background text-foreground transition-colors duration-200 ease-out",
        "hover:border-primary/40 hover:bg-muted/40",
      )}
    >
      <button
        type="button"
        onClick={handleOpen}
        className="block w-full p-3 text-left"
      >
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
          <FileText className="size-3" />
          <span className="font-medium text-foreground">Draft</span>
          {draft.status ? (
            <>
              <span>·</span>
              <span className="capitalize">{draft.status}</span>
            </>
          ) : null}
          {draft.post_type ? (
            <>
              <span>·</span>
              <span className="capitalize">
                {draft.post_type.replace(/_/g, " ")}
              </span>
            </>
          ) : null}
          {timestamp ? (
            <>
              <span>·</span>
              <span>{formatRelativeTime(timestamp)}</span>
            </>
          ) : null}
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {body}
        </p>
      </button>
      <div className="flex items-center justify-end px-3 pb-3">
        <button
          type="button"
          onClick={handleOpen}
          className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors duration-200 ease-out hover:bg-muted hover:text-foreground"
        >
          <ExternalLink className="size-3" />
          Open
        </button>
      </div>
    </div>
  );
}
