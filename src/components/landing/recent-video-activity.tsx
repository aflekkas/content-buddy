"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Clapperboard, Sparkles } from "lucide-react";
import { useReducedMotionSafe } from "@/lib/motion";
import { cn } from "@/lib/utils";

type ActivityItem = {
  id: string;
  eyebrow: string;
  title: string;
  detail: string;
  time: string;
};

const ACTIVITY_ITEMS: ActivityItem[] = [
  {
    id: "saas-launch",
    eyebrow: "Video queue generated",
    title: "5 launch clips planned",
    detail: "SaaS founder workflow",
    time: "now",
  },
  {
    id: "fitness-parent",
    eyebrow: "Hook set created",
    title: "8 short-form hooks drafted",
    detail: "Fitness creator niche",
    time: "1m",
  },
  {
    id: "coach-batch",
    eyebrow: "Ideas turned into scripts",
    title: "4 video outlines ready",
    detail: "Coaching content plan",
    time: "2m",
  },
  {
    id: "product-demo",
    eyebrow: "Content plan saved",
    title: "6 product demos queued",
    detail: "Indie product account",
    time: "3m",
  },
  {
    id: "newsletter-repurpose",
    eyebrow: "Repurpose plan generated",
    title: "Newsletter turned into clips",
    detail: "Creator education format",
    time: "5m",
  },
];

const VISIBLE_COUNT = 3;
const ROTATE_MS = 4600;

export function RecentVideoActivity() {
  const reducedMotion = useReducedMotionSafe();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;

    const interval = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % ACTIVITY_ITEMS.length);
    }, ROTATE_MS);

    return () => window.clearInterval(interval);
  }, [reducedMotion]);

  const visibleItems = useMemo(() => {
    if (reducedMotion) return ACTIVITY_ITEMS.slice(0, VISIBLE_COUNT);

    return Array.from({ length: VISIBLE_COUNT }, (_, offset) => {
      const index =
        (activeIndex - offset + ACTIVITY_ITEMS.length) % ACTIVITY_ITEMS.length;
      return ACTIVITY_ITEMS[index];
    });
  }, [activeIndex, reducedMotion]);

  return (
    <aside
      aria-label="Recent anonymized activity"
      className="pointer-events-none fixed right-3 bottom-3 z-30 hidden w-[min(360px,calc(100vw-1.5rem))] sm:block lg:right-5 lg:bottom-5"
    >
      <div className="relative flex flex-col items-end gap-2">
        <div className="absolute inset-x-0 bottom-0 h-28 rounded-full bg-primary/10 blur-3xl" />
        <AnimatePresence initial={false}>
          {visibleItems.map((item, index) => (
            <ActivityToast
              key={item.id}
              item={item}
              index={index}
              reducedMotion={reducedMotion}
            />
          ))}
        </AnimatePresence>
      </div>
    </aside>
  );
}

function ActivityToast({
  item,
  index,
  reducedMotion,
}: {
  item: ActivityItem;
  index: number;
  reducedMotion: boolean;
}) {
  const isNewest = index === 0;

  return (
    <motion.figure
      layout
      initial={reducedMotion ? false : { opacity: 0, y: 18, scale: 0.96 }}
      animate={{
        opacity: isNewest ? 1 : 0.78 - index * 0.12,
        y: 0,
        scale: 1 - index * 0.035,
      }}
      exit={reducedMotion ? undefined : { opacity: 0, y: -8, scale: 0.96 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border bg-background/92 p-3 shadow-xl shadow-primary/10 backdrop-blur-xl",
        "supports-[backdrop-filter]:bg-background/78",
        index > 0 && "mr-2",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {isNewest ? (
            <Sparkles className="size-4" />
          ) : (
            <Clapperboard className="size-4" />
          )}
        </span>
        <figcaption className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <CheckCircle2 className="size-3 text-primary" />
            <span className="truncate">{item.eyebrow}</span>
            <span aria-hidden className="text-muted-foreground/50">
              ·
            </span>
            <span className="shrink-0">{item.time}</span>
          </div>
          <p className="mt-1 truncate text-sm font-semibold tracking-tight text-foreground">
            {item.title}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {item.detail}
          </p>
        </figcaption>
      </div>
    </motion.figure>
  );
}
