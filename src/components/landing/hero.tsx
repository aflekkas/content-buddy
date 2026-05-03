import Link from "next/link";
import { ArrowRight, Copy, FileText } from "lucide-react";
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
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
            Riff on the news. Post about your life.
          </h1>

          <p className="mt-5 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
            Add the feeds you read. Drop a journal note when something matters.
            We draft LinkedIn posts in your voice. You ship.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={isAuthed ? "/dashboard" : "/login"}
              className={cn(buttonVariants({ size: "lg", shape: "pill", withArrow: true }))}
            >
              Open studio
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
              <p className="text-xs text-muted-foreground">New from your feeds</p>
            </div>
            <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 font-mono text-xs font-medium text-primary">
              0.87
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-1">
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Stratechery</span>
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

      <div className="flex flex-col items-center justify-center gap-2">
        <SketchArrow className="text-primary" />
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          synthesize
        </span>
      </div>

      <Card className="rounded-lg border-border/80 bg-background/95 shadow-xl shadow-primary/5 backdrop-blur">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold tracking-tight">
              Draft · synthesized 1m ago
            </p>
            <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
              Ready
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
        <CardFooter className="justify-end gap-1.5 bg-muted/30">
          <button
            type="button"
            className="inline-flex h-7 items-center gap-1.5 rounded-md border bg-background px-2.5 text-xs font-medium text-muted-foreground"
          >
            <Copy className="size-3.5" />
            Copy
          </button>
          <button
            type="button"
            className="inline-flex h-7 items-center gap-1.5 rounded-md bg-[#0A66C2] px-2.5 text-xs font-medium text-white"
          >
            <LinkedInGlyph className="size-3.5" />
            Publish
          </button>
        </CardFooter>
      </Card>
    </div>
  );
}

function LinkedInGlyph({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.37V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.26 2.37 4.26 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

function SketchArrow({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      width="96"
      height="40"
      viewBox="0 0 400 400"
      fill="none"
      stroke="currentColor"
      strokeOpacity="0.9"
      strokeWidth="18"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("rotate-90 md:rotate-0", className)}
    >
      <path d="M35 262C160.529 140.938 328.006 207.285 361 215.518" />
      <path d="M343.69 143C355.23 190.289 361 214.681 361 216.177C361 218.421 327.488 234.13 312 258" />
    </svg>
  );
}
