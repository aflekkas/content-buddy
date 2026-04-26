import Link from "next/link";
import { MessageSquareOff } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function ChatNotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <span
        aria-hidden
        className="flex size-12 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground"
      >
        <MessageSquareOff className="size-5" />
      </span>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">
          Chat not found
        </h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          This chat doesn&apos;t exist or isn&apos;t yours. Pick another from
          the switcher above, or start a fresh one.
        </p>
      </div>
      <Link
        href="/dashboard"
        className={buttonVariants({ size: "sm", className: "mt-1" })}
      >
        Go to your latest chat
      </Link>
    </div>
  );
}
