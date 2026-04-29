"use client";

import { motion } from "motion/react";
import { ListVideo, Sparkles, UserRound } from "lucide-react";

const FEATURES = [
  {
    icon: UserRound,
    title: "Brand panel that remembers",
    body: "Drop your bio and the facts you keep repeating. The chat threads them in so you stop re-explaining yourself every session.",
  },
  {
    icon: ListVideo,
    title: "A queue, not a graveyard",
    body: "Every idea worth keeping lands in a video queue with three states: idea, ready to film, filmed. Reorder, rename, ship.",
  },
  {
    icon: Sparkles,
    title: "Chat that drafts, not just answers",
    body: "Hooks, angles, a 30-second script — the chat knows what you make and writes things you would actually post.",
  },
];

const EASE = [0.22, 1, 0.36, 1] as const;

export function FeatureGrid() {
  return (
    <section id="features" className="border-t bg-muted/20">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Three panels. One workflow.
          </h2>
          <p className="mt-3 text-muted-foreground">
            The cockpit is built around the loop short-form creators already
            run, just with less tab-switching.
          </p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.4, ease: EASE, delay: i * 0.07 }}
              className="rounded-xl border bg-background p-6"
            >
              <span className="inline-flex size-9 items-center justify-center rounded-md border bg-muted/40 text-primary">
                <f.icon className="size-4" />
              </span>
              <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {f.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
