import { cn } from "@/lib/utils";
import { BRAND_NAME } from "@/lib/brand";

function LinkedInGlyph({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("text-primary", className)}
    >
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66H9.36V9h3.41v1.56h.05c.47-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return <LinkedInGlyph className={className} />;
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
      <LinkedInGlyph className={cn("shrink-0", iconClassName)} />
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
