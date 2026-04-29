import { ChevronDown } from "lucide-react";
import { SkeletonBar } from "@/components/ui/skeleton-bar";

export function ChatSwitcherSkeleton() {
  return (
    <span
      className="inline-flex min-w-0 items-center gap-1.5 px-1.5"
      aria-hidden
    >
      <SkeletonBar className="h-4 w-28" />
      <ChevronDown className="shrink-0 opacity-40" size={14} />
    </span>
  );
}
