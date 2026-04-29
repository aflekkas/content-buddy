"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CockpitMockup } from "./cockpit-mockup";
import { HeroPromptBar } from "./hero-prompt-bar";
import type { DemoPhase } from "./demo-types";
import { useReducedMotionSafe } from "@/lib/motion";

const EASE = [0.22, 1, 0.36, 1] as const;
const RUN_DURATION_MS = 6800;

const SUGGESTIONS = [
  "a daily YouTube short on AI tools I actually use",
  "weekly TikToks for indie SaaS founders",
  "shorts about my journey building in public",
  "fitness videos for busy parents",
];

export function HeroDemo({ isAuthed = false }: { isAuthed?: boolean }) {
  const router = useRouter();
  const reduced = useReducedMotionSafe();
  const [phase, setPhase] = useState<DemoPhase>("idle");
  const [prompt, setPrompt] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cockpitRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (phase !== "idle" && cockpitRef.current) {
      cockpitRef.current.scrollIntoView({
        behavior: reduced ? "auto" : "smooth",
        block: "center",
      });
    }
  }, [phase, reduced]);

  function handleSubmit() {
    if (phase !== "idle") return;
    if (reduced) {
      setPhase("done");
      return;
    }
    setPhase("running");
    timerRef.current = setTimeout(() => setPhase("done"), RUN_DURATION_MS);
  }

  function handleContinue() {
    if (isAuthed) {
      router.push("/dashboard");
      return;
    }
    const next = `/onboarding?prompt=${encodeURIComponent(prompt.trim())}`;
    router.push(`/login?next=${encodeURIComponent(next)}`);
  }

  const promptBar = (
    <HeroPromptBar
      variant={phase === "idle" ? "large" : "compact"}
      value={prompt}
      onChange={setPrompt}
      onSubmit={handleSubmit}
      disabled={phase !== "idle"}
    />
  );

  return (
    <LayoutGroup>
      <div className="relative">
        <AnimatePresence mode="wait" initial={false}>
          {phase === "idle" ? (
            <motion.div
              key="hero-idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="mx-auto w-full max-w-2xl"
            >
              {promptBar}

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <span className="text-[11px] tracking-wide text-muted-foreground/70 uppercase">
                  try
                </span>
                {SUGGESTIONS.map((s) => (
                  <Button
                    key={s}
                    type="button"
                    variant="outline"
                    size="sm"
                    shape="pill"
                    onClick={() => setPrompt(s)}
                    className="bg-background/60 text-[12px] text-muted-foreground hover:border-primary/40 hover:bg-background hover:text-foreground"
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="hero-cockpit"
              ref={cockpitRef}
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="relative mx-auto w-full max-w-6xl"
            >
              <CockpitMockup
                phase={phase}
                prompt={prompt}
                promptBarSlot={promptBar}
                overlaySlot={
                  <AnimatePresence>
                    {phase === "done" && (
                      <motion.div
                        key="banner-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5, ease: EASE }}
                        className="absolute inset-0 z-20 flex items-center justify-center bg-background/35 px-4"
                        style={{
                          backdropFilter: "blur(12px)",
                          WebkitBackdropFilter: "blur(12px)",
                        }}
                      >
                        <RevealCard onContinue={handleContinue} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                }
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </LayoutGroup>
  );
}

function RevealCard({ onContinue }: { onContinue: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 14, scale: 0.96 }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.12 }}
      className="flex flex-col items-center gap-4 rounded-2xl border bg-background px-7 py-7 text-center shadow-2xl shadow-primary/15 sm:px-9 sm:py-8"
    >
      <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground">
        <Check className="size-3.5 text-primary" />
        Queue ready
      </span>
      <p className="max-w-xs text-balance text-[13px] text-muted-foreground">
        Drafted from what you typed.
      </p>
      <Button shape="pill" withArrow onClick={onContinue} className="mt-1">
        Get my first 5 video ideas
        <ArrowRight className="size-4" />
      </Button>
    </motion.div>
  );
}
