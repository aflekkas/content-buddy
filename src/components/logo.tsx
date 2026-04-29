import { Clapperboard } from "lucide-react";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <Clapperboard
      aria-label="Content Buddy"
      className={cn("text-primary", className)}
    />
  );
}
