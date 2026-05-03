"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Copy, RotateCcw, TriangleAlert } from "lucide-react";
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
  const [copied, setCopied] = useState(false);

  const copyText = [
    errorMessage ? `Error: ${errorMessage}` : null,
    errorStack ? `\nStack:\n${errorStack}` : null,
    digest ? `\nref ${digest}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  async function handleCopy() {
    if (!copyText) return;
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

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
          className="flex size-14 items-center justify-center rounded-full border border-border bg-muted/40 text-destructive"
        >
          <TriangleAlert className="size-6" />
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
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Error
                  </CardTitle>
                  <CardDescription className="font-mono text-[11px] text-foreground/80 break-words whitespace-pre-wrap">
                    {errorMessage}
                  </CardDescription>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  aria-label="Copy error details"
                  className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border bg-background px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                >
                  {copied ? (
                    <>
                      <Check className="size-3.5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" />
                      Copy
                    </>
                  )}
                </button>
              </div>
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
