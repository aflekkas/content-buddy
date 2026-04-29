import { Brain } from "lucide-react";
import { SkeletonBar } from "@/components/ui/skeleton-bar";
import { ColumnHeader } from "@/components/cockpit/column-header";
import { cockpitSoftPanelClass } from "@/components/cockpit/cockpit-primitives";
import { cn } from "@/lib/utils";

export function BrandPanelSkeleton() {
  return (
    <div className="flex h-full flex-col" aria-hidden>
      <ColumnHeader
        icon={Brain}
        title="Memory"
        description="Markdown files the agent can read."
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <section className="space-y-3 border-b p-3">
          <div className="flex items-baseline justify-between gap-2">
            <div className="h-4 w-12 rounded bg-muted/60" />
            <div className="h-3 w-10 rounded bg-muted/40" />
          </div>
          <div className={cn("space-y-1 p-2", cockpitSoftPanelClass)}>
            <SkeletonBar className="h-3 w-28" />
            <SkeletonBar className="ml-4 h-3 w-24" />
            <SkeletonBar className="ml-4 h-3 w-32" />
            <SkeletonBar className="h-3 w-24" />
          </div>
        </section>
        <section className="space-y-3 p-3">
          <SkeletonBar className="h-8 w-full" />
          <SkeletonBar className="h-8 w-full" />
          <div className="rounded-lg border bg-muted/30 p-3">
            <SkeletonBar className="mb-2 h-3 w-3/4" />
            <SkeletonBar className="mb-2 h-3 w-full" />
            <SkeletonBar className="h-3 w-2/3" />
          </div>
        </section>
      </div>
    </div>
  );
}
