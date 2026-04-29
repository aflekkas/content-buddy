"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Clapperboard, UserRound } from "lucide-react";
import { useReducedMotionSafe } from "@/lib/motion";

type ActivityEvent = {
  id: string;
  maskedEmail: string;
  providerLabel: string;
  providerLogo: string;
  action: string;
  countryName: string | null;
  countryFlag: string | null;
  occurredAt: string;
};

type ActivityResponse = {
  events?: ActivityEvent[];
};

const INITIAL_DELAY_MS = 2600;
const DISPLAY_MS = 6200;
const BETWEEN_TOASTS_MS = 1700;
const POLL_MS = 36000;

export function RecentVideoActivity() {
  const reducedMotion = useReducedMotionSafe();
  const [queue, setQueue] = useState<ActivityEvent[]>([]);
  const [activeEvent, setActiveEvent] = useState<ActivityEvent | null>(null);
  const cursorRef = useRef<string | null>(null);
  const seenRef = useRef<Set<string>>(new Set());

  const fetchEvents = useCallback(async (after?: string | null) => {
    const url = after
      ? `/api/public/video-activity?after=${encodeURIComponent(after)}`
      : "/api/public/video-activity";

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return;

    const data = (await res.json()) as ActivityResponse;
    const events = (data.events ?? []).filter((event) => {
      if (seenRef.current.has(event.id)) return false;
      seenRef.current.add(event.id);
      return true;
    });

    if (events.length === 0) return;

    const latest = events.reduce((current, event) => {
      if (!current) return event.occurredAt;
      return new Date(event.occurredAt) > new Date(current)
        ? event.occurredAt
        : current;
    }, cursorRef.current);

    cursorRef.current = latest;
    setQueue((current) => [...current, ...events]);
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => {
      void fetchEvents();
    }, INITIAL_DELAY_MS);

    const poll = window.setInterval(() => {
      void fetchEvents(cursorRef.current);
    }, POLL_MS);

    return () => {
      window.clearTimeout(initial);
      window.clearInterval(poll);
    };
  }, [fetchEvents]);

  useEffect(() => {
    if (activeEvent || queue.length === 0) return;

    const next = queue[0];
    const timer = window.setTimeout(() => {
      setQueue((current) => current.slice(1));
      setActiveEvent(next);
    }, BETWEEN_TOASTS_MS);

    return () => window.clearTimeout(timer);
  }, [activeEvent, queue]);

  useEffect(() => {
    if (!activeEvent) return;

    const timer = window.setTimeout(() => {
      setActiveEvent(null);
    }, DISPLAY_MS);

    return () => window.clearTimeout(timer);
  }, [activeEvent]);

  return (
    <aside
      aria-label="Recent anonymized video activity"
      className="pointer-events-none fixed right-3 bottom-3 z-30 hidden w-[min(380px,calc(100vw-1.5rem))] sm:block lg:right-5 lg:bottom-5"
    >
      <AnimatePresence mode="wait">
        {activeEvent && (
          <ActivityToast
            key={activeEvent.id}
            event={activeEvent}
            reducedMotion={reducedMotion}
          />
        )}
      </AnimatePresence>
    </aside>
  );
}

function ActivityToast({
  event,
  reducedMotion,
}: {
  event: ActivityEvent;
  reducedMotion: boolean;
}) {
  return (
    <motion.figure
      initial={reducedMotion ? false : { opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reducedMotion ? undefined : { opacity: 0, y: 10, scale: 0.98 }}
      transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-2xl border bg-background/90 p-3 shadow-xl shadow-primary/10 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75"
    >
      <div className="absolute inset-x-6 -bottom-8 h-12 rounded-full bg-primary/15 blur-2xl" />
      <figcaption className="relative flex items-center gap-3">
        <span className="relative inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <UserRound className="size-4" />
          <span className="absolute -right-1 -bottom-1 inline-flex size-5 items-center justify-center rounded-full border border-background bg-background">
            <Image
              src={event.providerLogo}
              alt=""
              width={14}
              height={14}
              className="size-3.5"
            />
          </span>
        </span>
        <span className="min-w-0 flex-1 text-[13px] leading-snug text-muted-foreground">
          <span className="font-medium text-foreground">
            {event.maskedEmail}
          </span>{" "}
          {event.action} using{" "}
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            {event.providerLabel}
            <Clapperboard className="size-3.5 text-primary" />
          </span>
          <span className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground/80">
            <span>{timeAgo(event.occurredAt)}</span>
            {event.countryFlag && event.countryName && (
              <>
                <span aria-hidden>·</span>
                <span aria-label={event.countryName} title={event.countryName}>
                  {event.countryFlag}
                </span>
                <span>{event.countryName}</span>
              </>
            )}
          </span>
        </span>
      </figcaption>
    </motion.figure>
  );
}

function timeAgo(value: string): string {
  const elapsedMs = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return "just now";

  const minutes = Math.max(1, Math.round(elapsedMs / 60000));
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
