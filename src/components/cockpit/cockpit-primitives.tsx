import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const cockpitIconButtonClass =
  "inline-flex size-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

export const cockpitSoftPanelClass =
  "rounded-lg border border-border bg-muted/20";

export const cockpitDashedPanelClass =
  "rounded-lg border border-dashed border-border bg-muted/20";

export const cockpitInputClass =
  "border-border bg-background/70 shadow-none focus-visible:ring-2 focus-visible:ring-ring/40";

type CockpitFrameProps = ComponentProps<"div"> & {
  variant?: "app" | "preview";
  children: ReactNode;
};

export function CockpitFrame({
  variant = "app",
  className,
  children,
  ...props
}: CockpitFrameProps) {
  return (
    <div
      className={cn(
        "relative flex min-h-0 flex-col overflow-hidden bg-background",
        variant === "app" && "h-full",
        variant === "preview" &&
          "mx-auto w-full max-w-6xl rounded-2xl border shadow-2xl shadow-primary/5 lg:aspect-video",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

type CockpitTopBarFrameProps = ComponentProps<"header"> & {
  density?: "compact" | "comfortable";
  children: ReactNode;
};

export function CockpitTopBarFrame({
  density = "compact",
  className,
  children,
  ...props
}: CockpitTopBarFrameProps) {
  return (
    <header
      className={cn(
        "flex shrink-0 items-center justify-between border-b bg-background",
        density === "compact" ? "h-12 gap-3 px-4" : "h-14 gap-4 px-5",
        className,
      )}
      {...props}
    >
      {children}
    </header>
  );
}
