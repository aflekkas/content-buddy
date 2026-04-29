"use client";

import { motion } from "motion/react";

const STEPS = [
  {
    n: "01",
    title: "Tell it about you",
    body: "Bio, what you post, who it's for. Add facts you want remembered — those land in every chat without you pasting them.",
  },
  {
    n: "02",
    title: "Chat your way to ideas",
    body: "Riff on hooks, angles, drafts. The chat keeps a thread, the video queue keeps the keepers.",
  },
  {
    n: "03",
    title: "Film, mark filmed, repeat",
    body: "Move a video to ready, then to filmed. The next idea is already waiting in the queue.",
  },
];

const EASE = [0.22, 1, 0.36, 1] as const;

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="border-t"
    >
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            How it works
          </h2>
          <p className="mt-3 text-muted-foreground">
            No setup wizard. Open it, talk to it, ship.
          </p>
        </div>
        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <motion.li
              key={s.n}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.4, ease: EASE, delay: i * 0.08 }}
              className="relative rounded-xl border bg-background p-6"
            >
              <span className="font-mono text-xs font-medium tracking-widest text-primary">
                {s.n}
              </span>
              <h3 className="mt-3 text-base font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {s.body}
              </p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
