import { ListVideo } from "lucide-react";
import { SkeletonBar } from "@/components/ui/skeleton-bar";
import { ColumnHeader } from "@/components/cockpit/column-header";

export function VideoQueueSkeleton() {
  return (
    <div className="flex h-full flex-col" aria-hidden>
      <ColumnHeader
        icon={ListVideo}
        title="Video queue"
        description="Keep track of what to make next."
      />
      <ul className="space-y-2 p-4">
        {[0, 1, 2, 3].map((i) => (
          <li
            key={i}
            className="space-y-2 rounded-xl border border-border bg-muted/20 p-3"
          >
            <SkeletonBar className="h-2 w-1/4" />
            <SkeletonBar className="h-2.5 w-4/5" />
            <SkeletonBar className="h-2 w-3/5" />
          </li>
        ))}
      </ul>
    </div>
  );
}
