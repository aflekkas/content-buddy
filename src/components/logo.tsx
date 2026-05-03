import { NotebookPen } from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND_NAME } from "@/lib/brand";

export function LogoMark({ className }: { className?: string }) {
  return (
    <NotebookPen
      aria-hidden
      className={cn("text-primary", className)}
    />
  );
}

export function LogoLockup({
  className,
  iconClassName,
  textClassName,
}: {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      aria-label={BRAND_NAME}
    >
      <NotebookPen
        aria-hidden
        className={cn("shrink-0 text-primary", iconClassName)}
      />
      <span
        className={cn(
          "truncate text-sm font-semibold tracking-tight leading-none",
          textClassName,
        )}
      >
        {BRAND_NAME}
      </span>
    </span>
  );
}
