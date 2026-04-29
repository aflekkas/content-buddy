"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
        "flex w-full flex-col items-center justify-center px-6",
        variant === "page"
          ? "h-svh bg-background"
          : "h-full min-h-0 flex-1",
      )}
    >
      <FadeIn className="flex w-full max-w-md flex-col items-center text-center">
        <span
          aria-hidden
          className="flex size-10 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground"
        >
          <TriangleAlert className="size-4" />
        </span>

        <h1 className="mt-4 text-xl font-semibold tracking-tight sm:text-2xl">
          {title}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Button onClick={onRetry}>
            <RotateCcw />
            Reload
          </Button>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft />
            Back
          </Button>
        </div>

        {errorMessage ? (
          <Card size="sm" className="mt-6 w-full text-left">
            <CardHeader>
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Error
              </CardTitle>
              <CardDescription className="font-mono text-[11px] text-foreground/80 break-words whitespace-pre-wrap">
                {errorMessage}
              </CardDescription>
            </CardHeader>
            {errorStack ? (
              <CardContent>
                <details className="group">
                  <summary className="cursor-pointer list-none font-mono text-[11px] text-muted-foreground/70 hover:text-muted-foreground">
                    <span className="inline-block transition-transform group-open:rotate-90">
                      ›
                    </span>{" "}
                    Stack trace
                  </summary>
                  <pre className="mt-2 max-h-64 overflow-auto rounded-md border border-border/60 bg-muted/40 p-2.5 font-mono text-[11px] text-muted-foreground whitespace-pre-wrap break-words">
                    {errorStack}
                  </pre>
                </details>
              </CardContent>
            ) : null}
          </Card>
        ) : null}

        {digest ? (
          <p className="mt-4 font-mono text-[11px] text-muted-foreground/60">
            ref {digest}
          </p>
        ) : null}
      </FadeIn>
    </div>
  );
}
