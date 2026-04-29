"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, LogOut } from "lucide-react";
import { CircularLoader } from "@/components/ui/loader";
import { toast } from "sonner";
import { LogoMark, LogoLockup } from "@/components/logo";
import { DUR_NORMAL, EASE_OUT } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { PROVIDERS } from "@/lib/providers";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Step components
import { StepWelcome } from "./steps/step-welcome";
import { StepPlatforms } from "./steps/step-platforms";
import { StepNiche } from "./steps/step-niche";
import { StepPitch } from "./steps/step-pitch";
import { StepAudience } from "./steps/step-audience";
import { StepGoal } from "./steps/step-goal";
import { StepKey } from "./steps/step-key";
import { StepAha } from "./steps/step-aha";
import { derivePitchPlaceholder, type OnboardingFlowState } from "./steps/_shared";

const TOTAL_STEPS = 8;

export function OnboardingFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get("prompt")?.slice(0, 500).trim() ?? "";
  const [step, setStep] = useState(0);
  const [state, setState] = useState<OnboardingFlowState>({
    platforms: ["tiktok", "reels", "shorts"],
    nichePrimary: null,
    nicheSecondary: [],
    channelPitch: initialPrompt,
    audienceStage: null,
    primaryGoal: null,
    provider: "anthropic",
    apiKey: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    if (initialPrompt) {
      router.replace("/onboarding");
    }
  }, [initialPrompt, router]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });
  }, []);

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
        return (
          state.apiKey.startsWith(PROVIDERS[state.provider].keyPrefix) &&
          state.apiKey.length >= 20
        );
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
          provider: state.provider,
          api_key: state.apiKey.trim(),
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
      <Header step={step} totalSteps={TOTAL_STEPS - 1} email={userEmail} />

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
            {step === 0 && <StepWelcome onNext={next} />}
            {step === 1 && (
              <StepPlatforms
                value={state.platforms}
                onChange={(platforms) =>
                  setState((s) => ({ ...s, platforms }))
                }
              />
            )}
            {step === 2 && (
              <StepNiche
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
              <StepPitch
                value={state.channelPitch}
                placeholder={derivePitchPlaceholder(state)}
                onChange={(channelPitch) =>
                  setState((s) => ({ ...s, channelPitch }))
                }
              />
            )}
            {step === 4 && (
              <StepAudience
                value={state.audienceStage}
                onChange={(audienceStage) =>
                  setState((s) => ({ ...s, audienceStage }))
                }
              />
            )}
            {step === 5 && (
              <StepGoal
                value={state.primaryGoal}
                onChange={(primaryGoal) =>
                  setState((s) => ({ ...s, primaryGoal }))
                }
              />
            )}
            {step === 6 && (
              <StepKey
                provider={state.provider}
                apiKey={state.apiKey}
                onProviderChange={(provider) =>
                  setState((s) => ({ ...s, provider, apiKey: "" }))
                }
                onKeyChange={(apiKey) =>
                  setState((s) => ({ ...s, apiKey }))
                }
              />
            )}
            {step === 7 && (
              <StepAha
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

function AvatarDropdown({ email }: { email: string | null }) {
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = "/login";
    } finally {
      setSigningOut(false);
    }
  }

  const initial = email ? email[0].toUpperCase() : "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="grid size-7 shrink-0 place-items-center rounded-full border border-border/80 bg-muted text-xs font-semibold tracking-tight text-foreground transition-colors hover:border-foreground/30 hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        {initial}
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="end" sideOffset={6}>
        {email && (
          <>
            <DropdownMenuLabel className="truncate max-w-48 text-foreground">
              {email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem
          variant="destructive"
          disabled={signingOut}
          onClick={() => void handleSignOut()}
        >
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Header({
  step,
  totalSteps,
  email,
}: {
  step: number;
  totalSteps: number;
  email: string | null;
}) {
  const pct = Math.min(100, (step / totalSteps) * 100);
  return (
    <header className="relative bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
        <span className="grid place-items-center size-7 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-primary/15 via-background to-background ring-1 ring-border/80">
          <LogoMark className="size-4" />
        </span>

        <LogoLockup iconClassName="hidden" />

        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          {Math.min(step, totalSteps)} / {totalSteps}
        </span>

        <AvatarDropdown email={email} />
      </div>

      <div className="h-px w-full bg-muted/70">
        <motion.div
          className="h-px bg-primary"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: DUR_NORMAL, ease: EASE_OUT }}
        />
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
      <div className="mx-auto flex w-full max-w-3xl items-center justify-end gap-2 px-4 py-4 sm:px-6">
        <Button
          variant="outline"
          size="default"
          onClick={onBack}
          disabled={step === 0 || submitting}
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <Button
          size="default"
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
