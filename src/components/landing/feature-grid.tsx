"use client";

import { motion } from "motion/react";
import { KeyRound, Sparkles, UserRound } from "lucide-react";

const FEATURES = [
  {
    icon: UserRound,
    title: "Simple creator context",
    body: "Keep a niche and voice note attached to the chat without a file system to manage.",
  },
  {
    icon: KeyRound,
    title: "OpenAI only",
    body: "One provider path, one key flow, and a smaller model surface for the pivot.",
  },
  {
    icon: Sparkles,
    title: "Bare chat shell",
    body: "A focused chat surface stays live while the X-news to LinkedIn workflow lands in later stages.",
  },
];

const EASE = [0.22, 1, 0.36, 1] as const;

export function FeatureGrid() {
  return (
    <section id="features" className="border-t bg-muted/20">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Stripped down for the pivot.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Stage A removes the old surfaces and keeps the product compiling
            around the prerequisite OpenAI chat shell.
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
