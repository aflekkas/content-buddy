"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/motion";
import { cn } from "@/lib/utils";

type ErrorScreenProps = {
  variant?: "page" | "embedded";
  title?: string;
  description?: string;
  digest?: string;
  errorMessage?: string;
  errorStack?: string;
  onRetry: () => void;
};

export function ErrorScreen({
  variant = "page",
  title = "This page couldn't load",
  description = "Reload to try again, or go back.",
  digest,
  errorMessage,
  errorStack,
  onRetry,
}: ErrorScreenProps) {
  const router = useRouter();

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 text-center",
        variant === "page"
          ? "h-svh w-full bg-background"
          : "h-full min-h-0 flex-1",
      )}
    >
      <FadeIn className="flex flex-col items-center">
        <span
          aria-hidden
          className="flex size-12 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground"
        >
          <TriangleAlert className="size-5" />
        </span>

        <h1 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {description}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Button size="lg" onClick={onRetry}>
            <RotateCcw />
            Reload
          </Button>
          <Button size="lg" variant="outline" onClick={() => router.back()}>
            <ArrowLeft />
            Back
          </Button>
        </div>

        {errorMessage ? (
          <div className="mt-6 w-full max-w-xl text-left">
            <pre className="overflow-x-auto rounded-md border border-border bg-muted/40 p-3 font-mono text-[11px] text-muted-foreground whitespace-pre-wrap break-words">
              {errorMessage}
            </pre>
            {errorStack ? (
              <details className="mt-2">
                <summary className="cursor-pointer text-[11px] text-muted-foreground/70 hover:text-muted-foreground">
                  Stack trace
                </summary>
                <pre className="mt-2 overflow-x-auto rounded-md border border-border bg-muted/40 p-3 font-mono text-[11px] text-muted-foreground whitespace-pre-wrap break-words">
                  {errorStack}
                </pre>
              </details>
            ) : null}
          </div>
        ) : null}

        {digest ? (
          <p className="mt-6 font-mono text-[11px] text-muted-foreground/70">
            ref {digest}
          </p>
        ) : null}
      </FadeIn>
    </div>
  );
}
