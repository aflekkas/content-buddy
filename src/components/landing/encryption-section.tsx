"use client";

import { motion } from "motion/react";
import { KeyRound, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { DiaTextReveal } from "@/components/ui/dia-text-reveal";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { cn } from "@/lib/utils";

// TODO(byok): the visual below is a forward-looking commitment.
// Make sure the actual key storage path lives up to it: encrypt the user's
// provider key at rest, decrypt only inside the request that uses it,
// never log it, never expose it to the client. See AGENTS.md "Product Model".

const EASE = [0.22, 1, 0.36, 1] as const;

const COMMITMENTS = [
  {
    icon: Lock,
    title: "Encrypted at rest",
    body: "Your key is encrypted before it touches the database. Decrypted only inside the request that calls your provider.",
  },
  {
    icon: ShieldCheck,
    title: "Never logged, never shared",
    body: "It does not appear in error reports, analytics, or chat history. The only thing that sees the plaintext is the provider you chose.",
  },
  {
    icon: KeyRound,
    title: "Yours to revoke",
    body: "Rotate it in the provider's console, paste the new one, you're back. Your old key dies the moment they kill it.",
  },
];

export function EncryptionSection() {
  return (
    <section id="security" className="relative isolate overflow-hidden border-t bg-muted/20">
      <FlickeringGrid
        className={cn(
          "absolute inset-0 -z-10 size-full",
          "[mask-image:radial-gradient(ellipse_60%_70%_at_70%_50%,black,transparent_75%)]",
        )}
        squareSize={3}
        gridGap={6}
        flickerChance={0.25}
        color="oklch(0.685 0.169 237.323)"
        maxOpacity={0.18}
      />
      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              <Sparkles className="size-3 text-primary" />
              Your key, your terms
            </span>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              <DiaTextReveal
                text="Bring your own key."
                colors={[
                  "oklch(0.685 0.169 237.323)",
                  "oklch(0.746 0.16 232.661)",
                  "oklch(0.55 0.22 250)",
                ]}
                duration={1.4}
                delay={0.1}
              />{" "}
              <span className="text-muted-foreground">
                We treat it like one.
              </span>
            </h2>
            <p className="mt-3 max-w-md text-muted-foreground">
              Shortform Studio runs on whichever provider key you bring. You pay
              them directly, on your own terms, and the key itself never leaves
              the parts of the system that strictly need it.
            </p>

            <ul className="mt-8 space-y-5">
              {COMMITMENTS.map((c, i) => (
                <motion.li
                  key={c.title}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.4, ease: EASE, delay: 0.08 + i * 0.07 }}
                  className="flex gap-3"
                >
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border bg-background text-primary">
                    <c.icon className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold tracking-tight">
                      {c.title}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">
                      {c.body}
                    </p>
                  </div>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <div className="relative">
            <KeyVisual />
          </div>
        </div>
      </div>
    </section>
  );
}

function KeyVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="flex flex-col items-center justify-center gap-5 py-10"
    >
      {/* radial glow behind the icon */}
      <div className="relative flex items-center justify-center">
        <div
          aria-hidden
          className="absolute size-48 rounded-full bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute size-32 rounded-full bg-primary/8 blur-xl"
        />
        <motion.div
          animate={{ scale: [1, 1.04, 1] }}
          transition={{
            duration: 3.5,
            ease: "easeInOut",
            repeat: Infinity,
            repeatType: "loop",
          }}
          style={{ willChange: "transform" }}
        >
          <KeyRound
            className="relative size-24 text-primary drop-shadow-[0_0_18px_oklch(0.685_0.169_237.323/0.35)]"
            strokeWidth={1.5}
          />
        </motion.div>
      </div>

      {/* single understated label */}
      <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/80 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground backdrop-blur-sm">
        <Lock className="size-2.5 text-primary" />
        encrypted at rest
      </span>
    </motion.div>
  );
}
