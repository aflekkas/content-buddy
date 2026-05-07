import { ExternalLink, Quote, X } from "lucide-react";
import { formatRelativeTime } from "@/lib/system-prompt";
import { cn } from "@/lib/utils";

export type NewsSignalCardData = {
  id: string;
  source: string | null;
  posted_at: string;
  text: string;
  url: string;
  relevance_score: number | null;
};

type Props = {
  signal: NewsSignalCardData;
  variant?: "rail" | "chat";
  onDismiss?: (id: string) => void;
  onCite?: (signal: NewsSignalCardData) => void;
};

export function NewsSignalCard({
  signal,
  variant = "rail",
  onDismiss,
  onCite,
}: Props) {
  const score = signal.relevance_score ?? 0;
  const clickable = Boolean(onCite);
  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? () => onCite?.(signal) : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onCite?.(signal);
              }
            }
          : undefined
      }
      className={cn(
        "rounded-md border bg-background p-2 transition-colors duration-200 ease-out",
        clickable && "cursor-pointer hover:border-primary/40 hover:bg-muted/40",
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <span className="truncate font-medium text-foreground">
          {signal.source ?? "feed"}
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
        {signal.text}
      </p>
      <div className="mt-1.5 flex items-center justify-end gap-1">
        {onCite ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCite(signal);
            }}
            className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors duration-200 ease-out hover:bg-muted hover:text-foreground"
            aria-label="Reference in chat"
          >
            <Quote className="size-3" />
            Cite
          </button>
        ) : null}
        <a
          href={signal.url}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors duration-200 ease-out hover:bg-muted hover:text-foreground"
        >
          <ExternalLink className="size-3" />
          Open
        </a>
        {variant === "rail" && onDismiss ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss(signal.id);
            }}
            className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors duration-200 ease-out hover:bg-destructive/10 hover:text-destructive"
            aria-label="Dismiss signal"
          >
            <X className="size-3" />
            Dismiss
          </button>
        ) : null}
      </div>
    </div>
  );
}
