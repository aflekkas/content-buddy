import type { ComponentType, ReactNode, SVGProps } from "react";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  description?: string;
  titleSlot?: ReactNode;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  iconClassName?: string;
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
  left,
  right,
  className,
}: Props) {
  return (
    <header
      className={cn(
        "flex h-14 shrink-0 items-center gap-3 border-b bg-muted/50 px-4",
        className,
      )}
    >
      {left}
      {Icon ? (
        <span
          aria-hidden
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground",
            iconClassName,
          )}
        >
          <Icon className="size-4" />
        </span>
      ) : null}
      <div className="min-w-0 flex-1 leading-tight">
        {titleSlot ? (
          titleSlot
        ) : (
          <p className="truncate text-sm font-medium text-foreground">
            {title}
          </p>
        )}
        {description ? (
          <p className="truncate text-xs text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {right}
    </header>
  );
}
