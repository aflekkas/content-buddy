"use client";

import { motion } from "motion/react";
import { Sparkles } from "lucide-react";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { AuroraText } from "@/components/ui/aurora-text";
import { DotPattern } from "@/components/ui/dot-pattern";
import { HeroDemo } from "@/components/landing/hero-demo";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

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
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="mx-auto flex max-w-3xl flex-col items-center text-center"
        >
          <span className="group inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs backdrop-blur">
            <Sparkles className="size-3.5 text-primary" />
            <AnimatedShinyText className="!mx-0 !max-w-none">
              Built for short-form creators
            </AnimatedShinyText>
          </span>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.05 }}
            className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl"
          >
            Tell me what you want,{" "}
            <AuroraText
              colors={[
                "oklch(0.685 0.169 237.323)",
                "oklch(0.746 0.16 232.661)",
                "oklch(0.55 0.22 250)",
                "oklch(0.685 0.169 237.323)",
              ]}
            >
              I&apos;ll tell you what to film.
            </AuroraText>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.12 }}
            className="mt-5 max-w-xl text-balance text-base text-muted-foreground sm:text-lg"
          >
            A chat that knows your voice, remembers what you&apos;re building,
            and turns half-formed ideas into a queue of videos you can actually
            film.
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.2 }}
          className="mt-10 sm:mt-14"
        >
          <HeroDemo isAuthed={isAuthed} />
        </motion.div>
      </div>
    </section>
  );
}
