import type { ComponentType, ReactNode, SVGProps } from "react";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  description?: string;
  titleSlot?: ReactNode;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  iconClassName?: string;
  iconTone?: "neutral" | "memory" | "queue" | "chat";
  density?: "compact" | "comfortable";
  left?: ReactNode;
  right?: ReactNode;
  className?: string;
};

export function ColumnHeader({
  title,
  description,
  titleSlot,
  icon: Icon,
  iconClassName,
  iconTone,
  density = "compact",
  left,
  right,
  className,
}: Props) {
  const compact = density === "compact";
  const tone = iconTone ?? inferIconTone(title);

  return (
    <header
      className={cn(
        "flex shrink-0 items-center border-b bg-muted/40",
        compact ? "h-12 gap-2.5 px-3" : "h-14 gap-3 px-4",
        className,
      )}
    >
      {left}
      {Icon ? (
        <span
          aria-hidden
          className={cn(
            "flex shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground",
            compact ? "size-7" : "size-8",
            iconToneClassName(tone),
            iconClassName,
          )}
        >
          <Icon className={cn(compact ? "size-4" : "size-4.5")} />
        </span>
      ) : null}
      <div className="min-w-0 flex-1 leading-tight">
        {titleSlot ? (
          titleSlot
        ) : (
          <p
            className={cn(
              "truncate font-medium text-foreground",
              compact ? "text-xs" : "text-sm",
            )}
          >
            {title}
          </p>
        )}
        {description ? (
          <p
            className={cn(
              "truncate text-muted-foreground",
              compact ? "text-[11px]" : "text-xs",
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {right}
    </header>
  );
}

function inferIconTone(title: string | undefined): NonNullable<Props["iconTone"]> {
  if (title === "Memory") return "memory";
  if (title === "Drafts") return "queue";
  return "neutral";
}

function iconToneClassName(tone: NonNullable<Props["iconTone"]>) {
  switch (tone) {
    case "memory":
      return "text-sky-600 dark:text-sky-300";
    case "queue":
      return "text-amber-600 dark:text-amber-300";
    case "chat":
      return "text-violet-600 dark:text-violet-300";
    default:
      return null;
  }
}
