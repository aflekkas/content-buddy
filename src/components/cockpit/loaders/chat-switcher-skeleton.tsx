import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { ChevronDown } from "lucide-react";

export function ChatSwitcherSkeleton() {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-1.5 text-sm font-medium"
      aria-hidden
    >
      <AnimatedShinyText className="text-sm font-medium">
        Loading chat…
      </AnimatedShinyText>
      <ChevronDown className="shrink-0 opacity-40" size={14} />
    </span>
  );
}
