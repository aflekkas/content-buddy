"use client";

import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { ProviderIcon } from "@/components/ui/provider-icon";
import { PROVIDERS, PROVIDER_IDS, type ProviderId } from "@/lib/providers";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

// Compact display labels for tiles where the full PROVIDERS.label is verbose
// (e.g. "Llama (via Groq)" wraps in a tight card).
const DISPLAY_LABEL: Record<ProviderId, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Gemini",
  xai: "Grok",
  groq: "Llama",
};

const SUBLABEL: Record<ProviderId, string> = {
  anthropic: "Claude",
  openai: "GPT",
  google: "Google",
  xai: "xAI",
  groq: "via Groq",
};

function ProviderTile({ id, index }: { id: ProviderId; index: number }) {
  const [hovered, setHovered] = useState(false);
  const meta = PROVIDERS[id];

  return (
    <motion.div
      key={id}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.4, ease: EASE, delay: index * 0.06 }}
      whileHover={{ y: -2 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className={cn(
        "group relative flex flex-col items-start gap-3 rounded-xl border bg-background p-4",
        "transition-colors hover:border-primary/40",
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
      />
      <span className="inline-flex size-9 items-center justify-center rounded-md border bg-muted/30">
        <ProviderIcon provider={id} size={20} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold tracking-tight">
          {DISPLAY_LABEL[id]}
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {SUBLABEL[id]}
        </p>
      </div>

      {/* Count / model labels swap — fixed-height slot so tiles never resize */}
      <div className="relative h-10 w-full">
        <AnimatePresence mode="wait" initial={false}>
          {hovered ? (
            <motion.div
              key="models"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: EASE }}
              className="absolute inset-0 flex flex-col justify-center gap-1"
            >
              {meta.models.map((m, mi) => (
                <motion.span
                  key={m.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.22,
                    ease: EASE,
                    delay: mi * 0.05,
                  }}
                  className="font-mono text-[11px] text-muted-foreground"
                >
                  {m.label}
                </motion.span>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="count"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: EASE }}
              className="absolute inset-0 flex items-center gap-1"
            >
              <span className="text-xs text-muted-foreground">
                {meta.models.length} models
              </span>
              <span className="text-[10px] text-muted-foreground/60">→</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export function ProviderRow() {
  return (
    <section id="models" className="relative border-t">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Pick your model
          </span>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Whichever model you already pay for.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Bring a key from any of these. Switch providers in settings, models
            on a chat, and the rest of the cockpit stays put.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {PROVIDER_IDS.map((id, i) => (
            <ProviderTile key={id} id={id} index={i} />
          ))}
        </div>

        <p className="mt-8 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80">
          you pay the provider, never us
        </p>
      </div>
    </section>
  );
}
