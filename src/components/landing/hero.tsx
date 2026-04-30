import Link from "next/link";
import { ArrowRight, Copy, FileText, Sparkles } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { DotPattern } from "@/components/ui/dot-pattern";
import { cn } from "@/lib/utils";

export function Hero({ isAuthed = false }: { isAuthed?: boolean }) {
  return (
    <section className="relative isolate overflow-hidden">
      <DotPattern
        className={cn(
          "absolute inset-0 -z-10 text-foreground/10",
          "[mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]",
        )}
      />
      <div className="mx-auto max-w-6xl px-4 pt-16 pb-20 sm:px-6 sm:pt-24 sm:pb-28">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <span className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Sparkles className="size-3.5 text-primary" />
            AI synthesizer · X → LinkedIn
          </span>

          <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
            Turn your X feed into LinkedIn long-form. On autopilot.
          </h1>

          <p className="mt-5 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
            We poll the X accounts you care about. AI scores what&apos;s worth
            your LinkedIn audience and drafts long-form posts in your voice. You
            copy, you ship.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={isAuthed ? "/dashboard" : "/login"}
              className={cn(buttonVariants({ size: "lg", shape: "pill", withArrow: true }))}
            >
              Start free
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="#how"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg", shape: "pill" }),
                "bg-background/70",
              )}
            >
              How it works
            </Link>
          </div>
        </div>

        <FeedToDraftMockup />
      </div>
    </section>
  );
}

function FeedToDraftMockup() {
  return (
    <div className="mx-auto mt-14 grid max-w-5xl items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
      <Card className="rounded-lg border-border/80 bg-background/90 shadow-xl shadow-primary/5 backdrop-blur">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold tracking-tight">Feed inbox</p>
              <p className="text-xs text-muted-foreground">New signal from X</p>
            </div>
            <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 font-mono text-xs font-medium text-primary">
              0.87
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-1">
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">@swyx</span>
            <span>2h ago</span>
          </div>
          <p className="text-sm leading-relaxed text-foreground/85">
            Argues that GPT-5 reasoning costs are flattening — implications for
            indie tooling
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground">
              pricing
            </span>
            <span className="rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground">
              AI tools
            </span>
          </div>
        </CardContent>
        <CardFooter className="justify-end bg-muted/30">
          <button
            type="button"
            className="inline-flex h-7 items-center gap-1.5 rounded-md border bg-background px-2.5 text-xs font-medium text-muted-foreground"
          >
            <FileText className="size-3.5" />
            Draft
          </button>
        </CardFooter>
      </Card>

      <div className="flex items-center justify-center">
        <div className="flex items-center gap-2 rounded-full border bg-background/90 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm md:flex-col">
          <span className="hidden md:block">synthesize</span>
          <span className="md:hidden">synthesize</span>
          <ArrowRight className="size-4 rotate-90 text-primary md:rotate-0" />
        </div>
      </div>

      <Card className="rounded-lg border-border/80 bg-background/95 shadow-xl shadow-primary/5 backdrop-blur">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold tracking-tight">
              Draft · synthesized 1m ago
            </p>
            <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
              ready
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-1">
          <div className="relative max-h-28 overflow-hidden">
            <p className="text-sm leading-7 text-foreground/85">
              GPT-5 reasoning costs aren&apos;t going down. They&apos;re
              plateauing. Here&apos;s why that matters for anyone building indie
              AI tools: the winners won&apos;t be the teams with the biggest
              prompts, but the ones who know which decisions deserve deep
              reasoning...
            </p>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background to-transparent" />
          </div>
        </CardContent>
        <CardFooter className="justify-end bg-muted/30">
          <button
            type="button"
            className="inline-flex h-7 items-center gap-1.5 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground"
          >
            <Copy className="size-3.5" />
            Copy
          </button>
        </CardFooter>
      </Card>
    </div>
  );
}
