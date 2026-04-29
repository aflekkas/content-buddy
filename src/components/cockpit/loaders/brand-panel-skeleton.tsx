import { UserRound } from "lucide-react";
import { SkeletonBar } from "@/components/ui/skeleton-bar";
import { ColumnHeader } from "@/components/cockpit/column-header";

export function BrandPanelSkeleton() {
  return (
    <div className="flex h-full flex-col" aria-hidden>
      <ColumnHeader
        icon={UserRound}
        title="About you"
        description="Who you are, what you post, and who it's for."
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <section className="space-y-2 border-b p-4">
          <div className="mb-1.5 h-4 w-10 rounded bg-muted/60" />
          <div className="space-y-1.5 rounded-md border bg-muted/40 p-2.5">
            <SkeletonBar className="h-2.5 w-11/12" />
            <SkeletonBar className="h-2.5 w-full" />
            <SkeletonBar className="h-2.5 w-3/4" />
            <SkeletonBar className="h-2.5 w-5/6" />
          </div>
        </section>
        <section className="space-y-3 p-4">
          <div className="flex items-baseline justify-between gap-2">
            <div className="h-4 w-10 rounded bg-muted/60" />
            <div className="h-3 w-32 rounded bg-muted/40" />
          </div>
          <ul className="flex flex-col gap-2">
            {[
              "w-3/4",
              "w-2/3",
              "w-4/5",
              "w-3/5",
            ].map((w, i) => (
              <li
                key={i}
                className="rounded-lg border border-border bg-muted/30 px-3 py-2"
              >
                <SkeletonBar className={`h-2.5 ${w}`} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
