"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, KeyRound } from "lucide-react";
import { DotPattern } from "@/components/ui/dot-pattern";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

export function FinalCta({ isAuthed = false }: { isAuthed?: boolean }) {
  return (
    <section className="relative isolate border-t overflow-hidden">
      <DotPattern
        className={cn(
          "absolute inset-0 -z-10 text-foreground/10",
          "[mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]",
        )}
      />
      <div className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6">
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.45, ease: EASE }}
          className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl"
        >
          Stop staring at a blank doc.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.45, ease: EASE, delay: 0.08 }}
          className="mx-auto mt-4 max-w-xl text-balance text-muted-foreground"
        >
          Open Content Buddy, paste in a key from any supported provider, and
          start a chat. Your videos line up behind it.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.45, ease: EASE, delay: 0.15 }}
          className="mt-8 flex flex-col items-center gap-3"
        >
          <Link
            href={isAuthed ? "/dashboard" : "/login"}
            className={cn(buttonVariants({ size: "lg", shape: "pill", withArrow: true }))}
          >
            {isAuthed ? "Open dashboard" : "Get started"}
            <ArrowRight className="size-4" />
          </Link>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <KeyRound className="size-3.5" />
            Bring your own key — Anthropic, OpenAI, Gemini, Grok, or Llama
          </span>
        </motion.div>
      </div>
    </section>
  );
}
