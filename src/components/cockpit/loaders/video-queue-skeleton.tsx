import { ListVideo } from "lucide-react";
import { SkeletonBar } from "@/components/ui/skeleton-bar";
import { ColumnHeader } from "@/components/cockpit/column-header";
import { cockpitSoftPanelClass } from "@/components/cockpit/cockpit-primitives";
import { cn } from "@/lib/utils";

export function VideoQueueSkeleton() {
  return (
    <div className="flex h-full flex-col" aria-hidden>
      <ColumnHeader
        icon={ListVideo}
        title="Video queue"
        description="Keep track of what to make next."
      />
      <div className="space-y-2.5 border-b bg-background/80 px-3 py-3">
        <SkeletonBar className="h-8 w-full rounded-md" />
        <div className="flex gap-1.5">
          <SkeletonBar className="h-7 w-14 rounded-full" />
          <SkeletonBar className="h-7 w-16 rounded-full" />
          <SkeletonBar className="h-7 w-16 rounded-full" />
        </div>
      </div>
      <ul className="space-y-1.5 p-3">
        {[0, 1, 2, 3].map((i) => (
          <li
            key={i}
            className={cn("space-y-2 p-2.5", cockpitSoftPanelClass)}
          >
            <div className="flex items-center gap-2">
              <SkeletonBar className="h-5 w-14 rounded-full" />
              <SkeletonBar className="h-3 w-12" />
            </div>
            <SkeletonBar className="h-3.5 w-4/5" />
            <SkeletonBar className="h-2 w-3/5" />
          </li>
        ))}
      </ul>
    </div>
  );
}
