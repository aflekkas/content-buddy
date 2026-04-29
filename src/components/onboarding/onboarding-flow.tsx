"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  KeyRound,
  Search,
  Sparkles,
} from "lucide-react";
import { CircularLoader } from "@/components/ui/loader";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BRAND_NAME } from "@/lib/brand";
import { LogoMark } from "@/components/logo";
import { DUR_NORMAL, EASE_OUT } from "@/lib/motion";
import {
  NICHES,
  NICHE_BY_ID,
  ONBOARDING_PLATFORMS,
  type OnboardingPlatform,
} from "@/lib/niches";
import type { AudienceStage, PrimaryGoal } from "@/lib/db/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type FlowState = {
  platforms: OnboardingPlatform[];
  nichePrimary: string | null;
  nicheSecondary: string[];
  channelPitch: string;
  audienceStage: AudienceStage | null;
  primaryGoal: PrimaryGoal | null;
  anthropicKey: string;
};

const TOTAL_STEPS = 8;

const EASE = [0.22, 1, 0.36, 1] as const;

const [BRAND_LEAD, BRAND_TAIL] = (() => {
  const parts = BRAND_NAME.split(" ");
  if (parts.length < 2) return [BRAND_NAME, ""];
  return [parts.slice(0, -1).join(" "), parts.at(-1) ?? ""];
})();

const AUDIENCE_OPTIONS: {
  id: AudienceStage;
  label: string;
  range: string;
  copy: string;
}[] = [
  {
    id: "starting",
    label: "Just starting",
    range: "0 – 1k",
    copy: "Building from zero. Hooks and consistency matter most.",
  },
  {
    id: "growing",
    label: "Growing",
    range: "1k – 10k",
    copy: "Have a few wins. Sharpening niche and frequency.",
  },
  {
    id: "established",
    label: "Established",
    range: "10k – 100k",
    copy: "Predictable performance. Ready to monetize or scale.",
  },
  {
    id: "large",
    label: "Large",
    range: "100k+",
    copy: "Audience is built. Optimizing yield and brand.",
  },
];

const GOAL_OPTIONS: { id: PrimaryGoal; label: string; copy: string }[] = [
  { id: "grow", label: "Grow followers", copy: "Reach and retention first." },
  { id: "monetize", label: "Monetize", copy: "Brand deals, products, ads." },
  { id: "brand", label: "Build personal brand", copy: "Recognition over raw count." },
  { id: "traffic", label: "Drive traffic", copy: "Pull people to a site or product." },
  {
    id: "experiment",
    label: "Just experiment",
    copy: "Find your shape with no fixed goal.",
  },
];

export function OnboardingFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get("prompt")?.slice(0, 500).trim() ?? "";
  const [step, setStep] = useState(0);
  const [state, setState] = useState<FlowState>({
    platforms: ["tiktok", "reels", "shorts"],
    nichePrimary: null,
    nicheSecondary: [],
    channelPitch: initialPrompt,
    audienceStage: null,
    primaryGoal: null,
    anthropicKey: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialPrompt) {
      router.replace("/onboarding");
    }
  }, [initialPrompt, router]);

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const canAdvance = useMemo(() => {
    switch (step) {
      case 0:
        return true;
      case 1:
        return state.platforms.length > 0;
      case 2:
        return Boolean(state.nichePrimary);
      case 3:
        return state.channelPitch.trim().length >= 3;
      case 4:
        return Boolean(state.audienceStage);
      case 5:
        return Boolean(state.primaryGoal);
      case 6:
        return state.anthropicKey.startsWith("sk-ant-") &&
          state.anthropicKey.length >= 30;
      case 7:
        return false;
      default:
        return false;
    }
  }, [step, state]);

  const submit = async (): Promise<{ chatId: string } | null> => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platforms: state.platforms,
          niche_primary: state.nichePrimary,
          niche_secondary: state.nicheSecondary,
          channel_pitch: state.channelPitch.trim(),
          audience_stage: state.audienceStage,
          primary_goal: state.primaryGoal,
          anthropic_key: state.anthropicKey.trim(),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          (body as { message?: string }).message ??
          "Something went wrong. Try again.";
        toast.error(msg);
        if ((body as { error?: string }).error === "invalid_key") {
          setStep(6);
        }
        return null;
      }
      return body as { chatId: string };
    } catch {
      toast.error("Network error. Try again.");
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <Header step={step} totalSteps={TOTAL_STEPS - 1} />

      <main className="relative flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: DUR_NORMAL, ease: EASE_OUT }}
            className="w-full max-w-3xl"
          >
            {step === 0 && <WelcomeStep onNext={next} />}
            {step === 1 && (
              <PlatformsStep
                value={state.platforms}
                onChange={(platforms) =>
                  setState((s) => ({ ...s, platforms }))
                }
              />
            )}
            {step === 2 && (
              <NicheStep
                primary={state.nichePrimary}
                secondary={state.nicheSecondary}
                onChange={(primary, secondary) =>
                  setState((s) => ({
                    ...s,
                    nichePrimary: primary,
                    nicheSecondary: secondary,
                  }))
                }
              />
            )}
            {step === 3 && (
              <PitchStep
                value={state.channelPitch}
                placeholder={derivePitchPlaceholder(state)}
                onChange={(channelPitch) =>
                  setState((s) => ({ ...s, channelPitch }))
                }
              />
            )}
            {step === 4 && (
              <AudienceStep
                value={state.audienceStage}
                onChange={(audienceStage) =>
                  setState((s) => ({ ...s, audienceStage }))
                }
              />
            )}
            {step === 5 && (
              <GoalStep
                value={state.primaryGoal}
                onChange={(primaryGoal) =>
                  setState((s) => ({ ...s, primaryGoal }))
                }
              />
            )}
            {step === 6 && (
              <KeyStep
                value={state.anthropicKey}
                onChange={(anthropicKey) =>
                  setState((s) => ({ ...s, anthropicKey }))
                }
              />
            )}
            {step === 7 && (
              <AhaStep
                state={state}
                submit={submit}
                onDone={(chatId) => router.push(`/dashboard/chat/${chatId}`)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer
        step={step}
        canAdvance={canAdvance}
        submitting={submitting}
        onBack={back}
        onNext={next}
      />
    </div>
  );
}

function Header({ step, totalSteps }: { step: number; totalSteps: number }) {
  const pct = Math.min(100, (step / totalSteps) * 100);
  return (
    <header className="relative border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
        <span className="grid place-items-center size-9 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-primary/15 via-background to-background ring-1 ring-border/80">
          <LogoMark className="size-5" />
        </span>

        <div className="flex items-baseline gap-1.5 text-[15px] leading-none">
          <span className="font-semibold tracking-tight">{BRAND_LEAD}</span>
          {BRAND_TAIL && (
            <span
              className="italic font-medium tracking-tight text-foreground/90"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {BRAND_TAIL}
            </span>
          )}
        </div>

        <span className="ml-2 hidden text-xs text-muted-foreground sm:inline">
          setup
        </span>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-xs tabular-nums text-muted-foreground sm:inline">
            {Math.min(step, totalSteps)} / {totalSteps}
          </span>
          <div className="h-1 w-32 overflow-hidden rounded-full bg-muted/70 sm:w-44">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={false}
              animate={{ width: `${pct}%` }}
              transition={{ duration: DUR_NORMAL, ease: EASE_OUT }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}

function Footer({
  step,
  canAdvance,
  submitting,
  onBack,
  onNext,
}: {
  step: number;
  canAdvance: boolean;
  submitting: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  if (step === 7) return null;
  return (
    <footer className="relative border-t border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Button
          variant="ghost"
          size="lg"
          onClick={onBack}
          disabled={step === 0 || submitting}
          className="rounded-full px-3 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft />
          Back
        </Button>
        <Button
          size="lg"
          onClick={onNext}
          disabled={!canAdvance || submitting}
        >
          {submitting ? (
            <CircularLoader size="sm" />
          ) : (
            <>
              {step === 6 ? "Generate my first script" : "Next"}
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </div>
    </footer>
  );
}

function StepHeading({
  eyebrow,
  title,
  subtitle,
  align = "left",
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: string;
  align?: "left" | "center";
}) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-2",
        align === "center" ? "items-center text-center" : "items-start",
      )}
    >
      {eyebrow && (
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {eyebrow}
        </span>
      )}
      <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
        {title}
      </h2>
      {subtitle && (
        <p
          className={cn(
            "text-balance text-base text-muted-foreground",
            align === "center" ? "max-w-xl" : "max-w-2xl",
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center">
      <motion.span
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="relative mb-6 grid size-20 place-items-center"
      >
        <span className="relative grid size-20 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-primary/15 via-background to-background ring-1 ring-border/80">
          <LogoMark className="size-10" />
        </span>
      </motion.span>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE, delay: 0.05 }}
        className="mt-4 text-balance text-2xl font-semibold tracking-tight sm:text-3xl"
      >
        Let&apos;s tune {BRAND_NAME} to you
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE, delay: 0.12 }}
        className="mt-4 max-w-xl text-balance text-base text-muted-foreground"
      >
        Six quick questions, then I&apos;ll draft your first three hooks and a
        ready-to-film 30-second script.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE, delay: 0.2 }}
        className="mt-8"
      >
        <Button size="lg" onClick={onNext}>
          Let&apos;s set you up
          <ArrowRight className="size-4" />
        </Button>
      </motion.div>
    </div>
  );
}

function SelectableCard({
  active,
  onClick,
  children,
  className,
  ariaLabel,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <Button
      variant="outline"
      shape="card"
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={cn(
        "group relative h-full w-full p-5 transition-colors",
        active
          ? "border-primary bg-primary/5"
          : "border-border hover:border-foreground/30",
        className,
      )}
    >
      {children}
    </Button>
  );
}

function PlatformsStep({
  value,
  onChange,
}: {
  value: OnboardingPlatform[];
  onChange: (next: OnboardingPlatform[]) => void;
}) {
  const toggle = (id: OnboardingPlatform) => {
    if (value.includes(id)) {
      onChange(value.filter((p) => p !== id));
    } else {
      onChange([...value, id]);
    }
  };
  return (
    <div>
      <StepHeading
        eyebrow="Where you post"
        title="Pick the surfaces you actually publish on"
        subtitle="Defaults are the short-form trio. Toggle anything that doesn't fit."
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {ONBOARDING_PLATFORMS.map((p, i) => {
          const active = value.includes(p.id);
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE, delay: i * 0.05 }}
            >
              <SelectableCard
                active={active}
                onClick={() => toggle(p.id)}
                className="p-4"
              >
                <span className="text-base font-semibold tracking-tight">
                  {p.label}
                </span>
                <span className="mt-1 text-xs text-muted-foreground">
                  {p.hint}
                </span>
                <span
                  className={cn(
                    "mt-3 inline-flex size-5 items-center justify-center rounded-full border transition-all",
                    active
                      ? "border-primary bg-primary text-primary-foreground opacity-100"
                      : "border-border opacity-0 group-hover:opacity-50",
                  )}
                >
                  <Check className="size-3" />
                </span>
              </SelectableCard>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function NicheStep({
  primary,
  secondary,
  onChange,
}: {
  primary: string | null;
  secondary: string[];
  onChange: (primary: string | null, secondary: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return NICHES;
    return NICHES.filter((n) => n.label.toLowerCase().includes(q));
  }, [query]);

  const select = (id: string) => {
    if (id === primary) {
      const [nextPrimary, ...rest] = secondary;
      onChange(nextPrimary ?? null, rest);
      return;
    }
    if (secondary.includes(id)) {
      onChange(primary, secondary.filter((n) => n !== id));
      return;
    }
    if (!primary) {
      onChange(id, secondary);
      return;
    }
    if (secondary.length < 2) {
      onChange(primary, [...secondary, id]);
    }
  };

  return (
    <div>
      <StepHeading
        eyebrow="Your niche"
        title="What do you make videos about?"
        subtitle="Pick your main one first. Add up to two adjacent ones if it bleeds."
      />
      <div className="relative mb-5">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search niches"
          className="h-10 rounded-full pl-9"
        />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {filtered.map((n, i) => {
          const isPrimary = n.id === primary;
          const isSecondary = secondary.includes(n.id);
          const active = isPrimary || isSecondary;
          return (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE, delay: i * 0.025 }}
            >
              <SelectableCard
                active={active}
                onClick={() => select(n.id)}
                className="items-center p-4 text-center"
              >
                <span className="mx-auto text-2xl leading-none">
                  {n.emoji}
                </span>
                <span className="mt-2 text-sm font-medium tracking-tight">
                  {n.label}
                </span>
                {isPrimary && (
                  <span className="absolute top-2 right-2 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                    primary
                  </span>
                )}
                {isSecondary && (
                  <span className="absolute top-2 right-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    also
                  </span>
                )}
              </SelectableCard>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function PitchStep({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (next: string) => void;
}) {
  return (
    <div>
      <StepHeading
        eyebrow="Your one-liner"
        title="In one line, what's your channel?"
        subtitle="The way you'd say it to a friend. I'll quote you back to you sometimes."
      />
      <Card className="rounded-2xl border bg-muted/30 p-4 ring-0">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-primary/15 via-background to-background ring-1 ring-border/80">
            <LogoMark className="size-5" />
          </span>
          <div className="flex-1">
            <p className="mb-2 text-xs text-muted-foreground">
              {BRAND_NAME} is listening
            </p>
            <Textarea
              value={value}
              placeholder={placeholder}
              onChange={(e) => onChange(e.target.value)}
              rows={3}
              autoFocus
              className="resize-none border-0 bg-background/80 text-base shadow-none focus-visible:ring-1 focus-visible:ring-primary/30"
            />
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Plain words beat clever ones.</span>
              <span className="tabular-nums">
                {value.trim().length}/500
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function AudienceStep({
  value,
  onChange,
}: {
  value: AudienceStage | null;
  onChange: (next: AudienceStage) => void;
}) {
  return (
    <div>
      <StepHeading
        eyebrow="Your stage"
        title="Where are you in the journey?"
        subtitle="No judgment. Just helps me give you advice that actually applies."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {AUDIENCE_OPTIONS.map((opt, i) => {
          const active = opt.id === value;
          return (
            <motion.div
              key={opt.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE, delay: i * 0.05 }}
            >
              <SelectableCard active={active} onClick={() => onChange(opt.id)}>
                <div className="flex w-full items-baseline justify-between gap-2">
                  <span className="text-base font-semibold tracking-tight">
                    {opt.label}
                  </span>
                  <span className="rounded-full bg-muted/70 px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
                    {opt.range}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {opt.copy}
                </p>
              </SelectableCard>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function GoalStep({
  value,
  onChange,
}: {
  value: PrimaryGoal | null;
  onChange: (next: PrimaryGoal) => void;
}) {
  return (
    <div>
      <StepHeading
        eyebrow="Your goal"
        title="What's the win right now?"
        subtitle="Pick one. I'll score every script idea against it."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {GOAL_OPTIONS.map((opt, i) => {
          const active = opt.id === value;
          return (
            <motion.div
              key={opt.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE, delay: i * 0.05 }}
            >
              <SelectableCard active={active} onClick={() => onChange(opt.id)}>
                <span className="text-base font-semibold tracking-tight">
                  {opt.label}
                </span>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {opt.copy}
                </p>
              </SelectableCard>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function KeyStep({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const looksValid = value.startsWith("sk-ant-") && value.length >= 30;
  return (
    <div>
      <StepHeading
        eyebrow="Bring your key"
        title="Connect your Anthropic key"
        subtitle={`${BRAND_NAME} runs on your own Anthropic key. Your usage, your bill, your control.`}
      />
      <div className="rounded-xl border bg-background p-5">
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3">
          <KeyRound className="size-4 text-muted-foreground" />
          <Input
            type="password"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="sk-ant-..."
            autoFocus
            className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 transition-colors",
              looksValid ? "text-emerald-600" : "text-muted-foreground",
            )}
          >
            {looksValid && <Check className="size-3" />}
            {looksValid ? "Looks good" : "Starts with sk-ant-"}
          </span>
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
          >
            Where do I get one?
            <ExternalLink className="size-3" />
          </a>
        </div>
      </div>
      <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <KeyRound className="size-3.5" />
        Used right now to draft your starter script. Persistent storage rolls
        out separately.
      </p>
    </div>
  );
}

function AhaStep({
  state,
  submit,
  onDone,
}: {
  state: FlowState;
  submit: () => Promise<{ chatId: string } | null>;
  onDone: (chatId: string) => void;
}) {
  const niche = state.nichePrimary
    ? NICHE_BY_ID[state.nichePrimary]?.label.toLowerCase() ?? "your niche"
    : "your niche";
  const platform = state.platforms[0] ?? "tiktok";

  const stages = useMemo(
    () => [
      `Reading your channel pitch...`,
      `Pulling top hooks for ${niche}...`,
      `Tuning length for ${prettyPlatform(platform)}...`,
      `Drafting your first script...`,
    ],
    [niche, platform],
  );
  const [stageIdx, setStageIdx] = useState(0);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const interval = window.setInterval(() => {
      setStageIdx((i) => (i < stages.length - 1 ? i + 1 : i));
    }, 1400);

    submit().then((result) => {
      window.clearInterval(interval);
      if (cancelled) return;
      if (!result) {
        setFailed(true);
        return;
      }
      setStageIdx(stages.length - 1);
      setDone(true);
      window.setTimeout(() => {
        if (!cancelled) onDone(result.chatId);
      }, 600);
    });

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (failed) {
    return (
      <div className="flex flex-col items-center text-center">
        <h2 className="mt-4 text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
          That didn&apos;t go through
        </h2>
        <p className="mt-3 max-w-md text-balance text-muted-foreground">
          Most often this is the API key. Hit back, double-check it, and try
          again.
        </p>
        <div className="mt-7">
          <Button size="lg" onClick={() => window.location.reload()}>
            Restart
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative grid size-16 place-items-center">
        <span className="relative grid size-16 place-items-center rounded-full bg-gradient-to-br from-primary/15 via-background to-background ring-1 ring-border/80">
          <Sparkles className="size-7 text-primary" />
        </span>
      </div>

      <h2 className="mt-5 text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
        {done ? "Ready when you are" : "Building your starter pack"}
      </h2>

      <ul className="mt-7 flex w-full max-w-md flex-col gap-2 text-left">
        {stages.map((label, i) => {
          const active = i === stageIdx && !done;
          const complete = i < stageIdx || done;
          return (
            <li
              key={label}
              className={cn(
                "flex items-center gap-3 rounded-xl border bg-background px-3 py-2.5 text-sm transition-all",
                complete
                  ? "border-primary/40 bg-primary/[0.04] text-foreground"
                  : active
                    ? "border-border text-foreground"
                    : "border-border/70 text-muted-foreground opacity-60",
              )}
            >
              {complete ? (
                <Check className="size-4 text-primary" />
              ) : active ? (
                <CircularLoader size="sm" />
              ) : (
                <span className="size-4 rounded-full border" />
              )}
              {label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function derivePitchPlaceholder(state: FlowState): string {
  const niche = state.nichePrimary
    ? NICHE_BY_ID[state.nichePrimary]?.label.toLowerCase() ?? "fitness"
    : "fitness";
  const platform = prettyPlatform(state.platforms[0] ?? "tiktok");
  return `e.g., a ${niche} channel for busy parents on ${platform}`;
}

function prettyPlatform(p: OnboardingPlatform | string): string {
  switch (p) {
    case "tiktok":
      return "TikTok";
    case "reels":
      return "Reels";
    case "shorts":
      return "Shorts";
    case "youtube_long":
      return "YouTube";
    default:
      return String(p);
  }
}
