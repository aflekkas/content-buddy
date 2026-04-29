import Link from "next/link";
import { ArrowLeft, MessageSquarePlus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function DashboardNotFound() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
      <p
        aria-hidden
        className="font-mono text-[7rem] font-semibold leading-none tracking-tighter text-primary/10"
      >
        404
      </p>

      <p className="-mt-2 font-mono text-[11px] font-medium uppercase tracking-[0.25em] text-primary">
        chat not found
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        Can&apos;t find that one.
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        It might have been deleted, or the link is stale. Open another chat or
        start a fresh one.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/dashboard"
          className={cn(buttonVariants({ size: "sm" }))}
        >
          <ArrowLeft className="mr-1 size-3.5" />
          Back to your queue
        </Link>
        <Link
          href="/dashboard/chat/new"
          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
        >
          <MessageSquarePlus className="mr-1 size-3.5" />
          New chat
        </Link>
      </div>
    </div>
  );
}
