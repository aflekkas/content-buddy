import { Clapperboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND_NAME } from "@/lib/brand";

export function LogoMark({ className }: { className?: string }) {
  return (
    <Clapperboard
      aria-hidden
      className={cn("text-primary", className)}
    />
  );
}

/**
 * Icon + wordmark lockup. The icon is decorative (aria-hidden) and the
 * visible text carries the accessible label. Use wherever the full product
 * name should be readable, e.g. nav, topbar, auth header.
 *
 * `iconClassName` — applied to the icon (e.g. `"size-5"`)
 * `textClassName` — applied to the text span (e.g. `"hidden sm:inline"`)
 */
export function LogoLockup({
  className,
  iconClassName,
  textClassName,
}: {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
}) {
  const parts = BRAND_NAME.split(" ");
  const lead = parts.length >= 2 ? parts.slice(0, -1).join(" ") : BRAND_NAME;
  const tail = parts.length >= 2 ? (parts.at(-1) ?? "") : "";

  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      aria-label={BRAND_NAME}
    >
      <Clapperboard aria-hidden className={cn("shrink-0 text-primary", iconClassName)} />
      <span className={cn("truncate text-sm font-semibold tracking-tight leading-none", textClassName)}>
        {lead}
        {tail && (
          <span className="font-medium text-foreground/80"> {tail}</span>
        )}
      </span>
    </span>
  );
}
