"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { CircularLoader } from "@/components/ui/loader";
import { LogoLockup } from "@/components/logo";
import { StepWelcome } from "@/components/onboarding/steps/step-welcome";
import { StepKeys } from "@/components/onboarding/steps/step-keys";
import { StepProfile } from "@/components/onboarding/steps/step-profile";
import { StepSources } from "@/components/onboarding/steps/step-sources";
import { cn } from "@/lib/utils";

export type OnboardingState = {
  openaiKey: string;
  openaiKeySaved: boolean;
  apifyToken: string;
  apifyTokenSaved: boolean;
  niche: string;
  voiceNotes: string;
  ownHandle: string;
  nicheHandles: string;
};

type Step = "welcome" | "keys" | "profile" | "sources";

const STEPS: Step[] = ["welcome", "keys", "profile", "sources"];

const STEP_LABELS: Record<Step, string> = {
  welcome: "Welcome",
  keys: "Keys",
  profile: "Profile",
  sources: "Sources",
};

const INITIAL_STATE: OnboardingState = {
  openaiKey: "",
  openaiKeySaved: false,
  apifyToken: "",
  apifyTokenSaved: false,
  niche: "",
  voiceNotes: "",
  ownHandle: "",
  nicheHandles: "",
};

type Props = {
  userId: string;
};

export function OnboardingFlow({ userId }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const [state, setState] = useState<OnboardingState>(INITIAL_STATE);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  const stepIndex = STEPS.indexOf(step);
  const progress = useMemo(
    () => ((stepIndex + 1) / STEPS.length) * 100,
    [stepIndex],
  );

  function goTo(nextStep: Step) {
    setFinishError(null);
    setStep(nextStep);
  }

  async function completeOnboarding() {
    setFinishing(true);
    setFinishError(null);

    try {
      const completeRes = await fetch("/api/onboarding/complete", {
        method: "POST",
      });

      if (!completeRes.ok) {
        throw new Error("complete_failed");
      }

      try {
        void fetch(`/api/cron/poll-sources?user_id=${encodeURIComponent(userId)}`, {
          method: "POST",
        }).catch(() => undefined);
      } catch {
        // First-poll endpoint is delivered in a later stage.
      }

      router.replace("/dashboard/feed");
    } catch {
      setFinishError("Could not finish onboarding. Try again.");
      setFinishing(false);
    }
  }

  const content = {
    welcome: <StepWelcome onContinue={() => goTo("keys")} />,
    keys: (
      <StepKeys
        state={state}
        setState={setState}
        onContinue={() => goTo("profile")}
      />
    ),
    profile: (
      <StepProfile
        state={state}
        setState={setState}
        onContinue={() => goTo("sources")}
      />
    ),
    sources: (
      <StepSources
        state={state}
        setState={setState}
        onFinish={() => void completeOnboarding()}
        finishing={finishing}
      />
    ),
  } satisfies Record<Step, ReactNode>;

  return (
    <main className="min-h-svh bg-muted/20 text-foreground">
      <div className="mx-auto flex min-h-svh w-full max-w-3xl flex-col px-4 py-6 sm:px-6">
        <header className="flex flex-col gap-4 border-b pb-5">
          <div className="flex items-center justify-between gap-4">
            <LogoLockup iconClassName="size-5" textClassName="text-sm" />
            <span className="text-sm text-muted-foreground">
              Step {stepIndex + 1} of {STEPS.length}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              />
            </div>
            <nav className="grid grid-cols-4 gap-2" aria-label="Onboarding steps">
              {STEPS.map((item, index) => (
                <span
                  key={item}
                  className={cn(
                    "truncate text-xs font-medium",
                    index <= stepIndex
                      ? "text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {STEP_LABELS[item]}
                </span>
              ))}
            </nav>
          </div>
        </header>

        <section className="flex flex-1 items-center py-8 sm:py-12">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="w-full"
            >
              {content[step]}
            </motion.div>
          </AnimatePresence>
        </section>

        <footer className="flex min-h-9 items-center justify-between gap-3 border-t pt-5">
          <Button
            type="button"
            variant="ghost"
            disabled={stepIndex === 0 || finishing}
            onClick={() => goTo(STEPS[Math.max(0, stepIndex - 1)])}
          >
            Back
          </Button>
          {finishError ? (
            <p className="text-sm text-destructive">{finishError}</p>
          ) : finishing ? (
            <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <CircularLoader size="sm" />
              Finishing...
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Your keys stay encrypted and server-side.
            </p>
          )}
        </footer>
      </div>
    </main>
  );
}
