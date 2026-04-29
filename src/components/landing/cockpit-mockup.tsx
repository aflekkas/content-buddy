"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ListVideo,
  MessageSquarePlus,
  Search,
  Sparkles,
  UserRound,
} from "lucide-react";
import { CircularLoader } from "@/components/ui/loader";
import { BorderBeam } from "@/components/ui/border-beam";
import { SkeletonBar } from "@/components/ui/skeleton-bar";
import { BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";
import type { DemoPhase } from "./demo-types";

type FactRow = { id: string; content: string };
type StatusKey = "idea" | "ready" | "filmed";
type VideoRow = {
  id: string;
  title: string;
  hook: string;
  status: StatusKey;
  updated: string;
};

const FACTS: FactRow[] = [
  { id: "f1", content: "Posts on LinkedIn and YouTube Shorts" },
  { id: "f2", content: "Tone: direct, a little contrarian" },
  { id: "f3", content: "Targets founders and operators" },
];

const VIDEOS: VideoRow[] = [
  {
    id: "v1",
    title: "What I learned shipping in a weekend",
    hook: "I built and shipped a tool in two days. Here's what broke first.",
    status: "ready",
    updated: "2h ago",
  },
  {
    id: "v2",
    title: "The cheapest AI stack for solo builders",
    hook: "You don't need a $200 IDE to ship. Here's the setup I actually use.",
    status: "idea",
    updated: "1d ago",
  },
  {
    id: "v3",
    title: "Why your hooks are landing flat",
    hook: "Three rules I follow before I press record.",
    status: "filmed",
    updated: "3d ago",
  },
  {
    id: "v4",
    title: "Build in public without losing your mind",
    hook: "A small ritual that keeps the loop tight.",
    status: "idea",
    updated: "5d ago",
  },
];

const STATUS_CHIP: Record<StatusKey, { label: string; chip: string }> = {
  idea: {
    label: "Idea",
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  },
  ready: {
    label: "Ready to film",
    chip: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
  },
  filmed: {
    label: "Filmed",
    chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  },
};

const FILTERS: { key: "all" | StatusKey; label: string; count: number }[] = [
  { key: "all", label: "All", count: VIDEOS.length },
  {
    key: "idea",
    label: "Ideas",
    count: VIDEOS.filter((v) => v.status === "idea").length,
  },
  {
    key: "ready",
    label: "Ready",
    count: VIDEOS.filter((v) => v.status === "ready").length,
  },
  {
    key: "filmed",
    label: "Filmed",
    count: VIDEOS.filter((v) => v.status === "filmed").length,
  },
];

const EASE = [0.22, 1, 0.36, 1] as const;

const USER_MSG_DELAY = 0.5;
const FACT_DELAY = 1.2;
const FACT_STAGGER = 0.25;
const ROW_DELAY = 2.4;
const ROW_STAGGER = 0.22;
const TYPING_DELAY = 3.6;
const ASSISTANT_DELAY = 4.2;
const FOLLOWUP_DELAY = 5.6;

const STATUS_MESSAGES = [
  { at: 0, label: "thinking…" },
  { at: 1100, label: "reading your bio…" },
  { at: 2300, label: "drafting angles…" },
  { at: 3600, label: "queueing videos…" },
  { at: 5200, label: "polishing…" },
];

type Props = {
  phase?: DemoPhase;
  prompt?: string;
  promptBarSlot?: ReactNode;
  overlaySlot?: ReactNode;
};

export function CockpitMockup({
  phase = "idle",
  prompt = "",
  promptBarSlot = null,
  overlaySlot = null,
}: Props) {
  return (
    <div className="relative mx-auto flex w-full max-w-6xl flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl shadow-primary/5 lg:aspect-video">
      <BorderBeam
        size={220}
        duration={9}
        colorFrom="oklch(0.685 0.169 237.323)"
        colorTo="oklch(0.746 0.16 232.661)"
      />

      <FakeTopBar phase={phase} />

      <div className="hidden min-h-0 flex-1 lg:flex">
        <FakeBrandPanel phase={phase} />
        <FakeVideoQueue phase={phase} />
        <FakeChat phase={phase} prompt={prompt} promptBarSlot={promptBarSlot} />
      </div>

      <div className="flex min-h-[460px] flex-1 flex-col lg:hidden">
        <FakeChat
          phase={phase}
          prompt={prompt}
          promptBarSlot={promptBarSlot}
          compact
        />
      </div>

      {overlaySlot}
    </div>
  );
}

function FakeTopBar({ phase }: { phase: DemoPhase }) {
  const [statusIdx, setStatusIdx] = useState(0);

  useEffect(() => {
    if (phase !== "running") return;
    const timers = STATUS_MESSAGES.map((m, i) =>
      setTimeout(() => setStatusIdx(i), m.at),
    );
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-b bg-background px-4">
      <span className="text-sm font-medium tracking-tight">{BRAND_NAME}</span>
      <div className="flex items-center gap-3">
        <AnimatePresence mode="wait">
          {phase === "running" ? (
            <motion.span
              key={`status-${statusIdx}`}
              initial={{ opacity: 0, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 3 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-primary"
            >
              <CircularLoader size="sm" className="size-3" />
              {STATUS_MESSAGES[statusIdx]?.label ?? "thinking…"}
            </motion.span>
          ) : phase === "done" ? (
            <motion.span
              key="done"
              initial={{ opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400"
            >
              done
            </motion.span>
          ) : (
            <motion.span
              key="email"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="hidden text-xs text-muted-foreground sm:inline"
            >
              you@example.com
            </motion.span>
          )}
        </AnimatePresence>
        <span className="size-7 rounded-full bg-muted" aria-hidden />
      </div>
    </div>
  );
}

function FakeColumnHeader({
  Icon,
  title,
  description,
  trailing,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  title: React.ReactNode;
  description?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex h-12 shrink-0 items-center gap-2.5 border-b bg-muted/50 px-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-xs font-medium text-foreground">{title}</p>
        {description ? (
          <p className="truncate text-[11px] text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {trailing}
    </div>
  );
}

function TypingDot({ delay }: { delay: number }) {
  return (
    <motion.span
      className="inline-block size-1.5 rounded-full bg-muted-foreground/60"
      animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
      transition={{
        duration: 0.9,
        ease: "easeInOut",
        repeat: Infinity,
        delay,
      }}
    />
  );
}


function FakeBrandPanel({ phase }: { phase: DemoPhase }) {
  const showFacts = phase !== "idle";

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r">
      <FakeColumnHeader
        Icon={UserRound}
        title="About you"
        description="Who you are and who it's for."
      />
      <div className="flex-1 space-y-4 overflow-hidden p-3">
        <div>
          <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
            Bio
          </label>
          <div className="space-y-1.5 rounded-md border bg-muted/40 p-2.5">
            <SkeletonBar className="h-2.5 w-11/12" />
            <SkeletonBar className="h-2.5 w-full" />
            <SkeletonBar className="h-2.5 w-3/4" />
          </div>
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">
              Facts
            </span>
            <span className="text-[10px] text-muted-foreground">
              Remembered from past chats
            </span>
          </div>
          <ul className="space-y-1.5">
            {(showFacts ? FACTS : FACTS).map((f, i) =>
              showFacts ? (
                <motion.li
                  key={f.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.35,
                    ease: EASE,
                    delay: FACT_DELAY + i * FACT_STAGGER,
                  }}
                  className="rounded-md border bg-muted/30 px-2.5 py-1.5"
                >
                  <SkeletonBar
                    className={cn(
                      "h-2.5",
                      i === 0 ? "w-3/4" : i === 1 ? "w-2/3" : "w-4/5",
                    )}
                  />
                </motion.li>
              ) : (
                <li
                  key={f.id}
                  className="rounded-md border border-dashed bg-muted/20 px-2.5 py-1.5"
                >
                  <SkeletonBar
                    className={cn(
                      "h-2.5",
                      i === 0 ? "w-3/4" : i === 1 ? "w-2/3" : "w-4/5",
                    )}
                  />
                </li>
              ),
            )}
          </ul>
        </div>
      </div>
    </aside>
  );
}

function FakeVideoQueue({ phase }: { phase: DemoPhase }) {
  const showRows = phase !== "idle";

  return (
    <aside className="flex w-80 shrink-0 flex-col border-r">
      <FakeColumnHeader
        Icon={ListVideo}
        title="Video queue"
        description="What to make next."
      />
      <div className="space-y-2 border-b bg-background/80 px-3 py-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <div className="h-8 w-full rounded-md border bg-background pr-2 pl-7 text-[11px] leading-8 text-muted-foreground">
            Search videos
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f, i) => (
            <span
              key={f.key}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                i === 0
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-muted/30 text-muted-foreground",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "rounded-full px-1 text-[9px]",
                  i === 0
                    ? "bg-primary-foreground/25 text-primary-foreground"
                    : "bg-background/60",
                )}
              >
                {showRows ? f.count : "·"}
              </span>
            </span>
          ))}
        </div>
      </div>
      <ul className="flex-1 space-y-1.5 overflow-hidden p-3">
        {showRows
          ? VIDEOS.map((v, i) => {
              const meta = STATUS_CHIP[v.status];
              return (
                <motion.li
                  key={v.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.35,
                    ease: EASE,
                    delay: ROW_DELAY + i * ROW_STAGGER,
                  }}
                  className="space-y-1.5 rounded-lg border bg-muted/20 p-2.5"
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium tracking-wide uppercase",
                        meta.chip,
                      )}
                    >
                      {meta.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {v.updated}
                    </span>
                  </div>
                  <SkeletonBar className="h-2.5 w-4/5" />
                  <SkeletonBar className="h-2 w-3/5" />
                </motion.li>
              );
            })
          : VIDEOS.map((v) => (
              <li
                key={v.id}
                className="space-y-1.5 rounded-lg border border-dashed bg-muted/20 p-2.5"
              >
                <SkeletonBar className="h-2 w-1/4" />
                <SkeletonBar className="h-2.5 w-3/4" />
                <SkeletonBar className="h-2 w-2/3" />
              </li>
            ))}
      </ul>
    </aside>
  );
}

function FakeChat({
  phase,
  prompt,
  promptBarSlot,
  compact = false,
}: {
  phase: DemoPhase;
  prompt: string;
  promptBarSlot: ReactNode;
  compact?: boolean;
}) {
  const showUser = phase !== "idle" && prompt.trim().length > 0;
  const showAssistant = phase !== "idle";

  const headerTitle = compact
    ? "your first chat"
    : showUser
      ? "Your first chat"
      : "Chat will start here";

  return (
    <section
      className={cn(
        "flex min-w-0 flex-1 flex-col",
        compact && "h-full",
      )}
    >
      <FakeColumnHeader
        Icon={Sparkles}
        title={
          <span className="inline-flex items-center gap-1.5">
            {headerTitle}
            <span className="text-muted-foreground">▾</span>
          </span>
        }
        trailing={
          <span className="hidden size-7 items-center justify-center rounded-md border bg-background text-muted-foreground sm:inline-flex">
            <MessageSquarePlus className="size-3.5" />
          </span>
        }
      />
      <div className="flex-1 space-y-3 overflow-hidden p-4">
        {showUser ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE, delay: USER_MSG_DELAY }}
            className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-md bg-primary px-3 py-2 text-[12px] leading-relaxed whitespace-pre-wrap text-primary-foreground"
          >
            {prompt}
          </motion.div>
        ) : (
          <div className="ml-auto flex max-w-[80%] flex-col gap-1.5 rounded-2xl rounded-br-md border border-dashed bg-muted/20 px-3 py-2">
            <SkeletonBar className="h-2.5 w-32" />
            <SkeletonBar className="h-2.5 w-24" />
          </div>
        )}

        {showAssistant && phase === "running" ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE, delay: TYPING_DELAY }}
            className="inline-flex items-center gap-1 rounded-2xl rounded-bl-md border bg-muted/40 px-3 py-2"
          >
            <TypingDot delay={0} />
            <TypingDot delay={0.15} />
            <TypingDot delay={0.3} />
          </motion.div>
        ) : null}

        {showAssistant ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE, delay: ASSISTANT_DELAY }}
            className="w-fit max-w-[88%] space-y-1.5 rounded-2xl rounded-bl-md border bg-muted/40 px-3 py-2 text-[12px] leading-relaxed"
          >
            <p className="font-medium">
              Got it. Pulled five angles from that idea.
            </p>
            <p className="text-muted-foreground">
              Each one&apos;s sitting in your queue with a status. Pick one and
              I&apos;ll draft the full 30-second script.
            </p>
          </motion.div>
        ) : (
          <div className="max-w-[88%] space-y-1.5 rounded-2xl rounded-bl-md border border-dashed bg-muted/20 px-3 py-2">
            <SkeletonBar className="h-2.5 w-3/5" />
            <SkeletonBar className="h-2.5 w-4/5" />
            <SkeletonBar className="h-2.5 w-2/5" />
          </div>
        )}

        {showAssistant && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE, delay: FOLLOWUP_DELAY }}
            className="w-fit max-w-[70%] rounded-2xl rounded-bl-md border bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground"
          >
            ↑ first one&apos;s the sharpest. want me to start there?
          </motion.div>
        )}
      </div>
      <div className="border-t bg-background p-3">
        {promptBarSlot ?? (
          <div className="flex items-center gap-2 rounded-xl border border-dashed bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground/70">
            <Sparkles className="size-3.5 shrink-0" />
            <span className="flex-1 truncate">
              type above to start your first chat
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
