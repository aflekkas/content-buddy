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

import { StepWelcome } from "./steps/step-welcome";
import { StepPlatforms } from "./steps/step-platforms";
import { StepNiche } from "./steps/step-niche";
import { StepPitch } from "./steps/step-pitch";
import { StepAudience } from "./steps/step-audience";
import { StepGoal } from "./steps/step-goal";
import { StepKey } from "./steps/step-key";
import { StepAha } from "./steps/step-aha";
import { StepFormats, FORMAT_LABELS } from "./steps/step-formats";
import { StepCadence, CADENCE_LABELS } from "./steps/step-cadence";
import { StepVoice, VOICE_LABELS } from "./steps/step-voice";
import { StepInspirations } from "./steps/step-inspirations";
import {
  derivePitchPlaceholder,
  type OnboardingFlowState,
} from "./steps/_shared";

type StepKind =
  | "welcome"
  | "key"
  | "platforms"
  | "niche"
  | "pitch"
  | "audience"
  | "goal"
  | "formats"
  | "cadence"
  | "voice"
  | "inspirations"
  | "aha";

const STEPS: StepKind[] = [
  "welcome",
  "key",
  "platforms",
  "niche",
  "pitch",
  "audience",
  "goal",
  "formats",
  "cadence",
  "voice",
  "inspirations",
  "aha",
];

const TOTAL_STEPS = STEPS.length;

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
    videoFormats: [],
    postingCadence: null,
    voiceTone: [],
    inspirations: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [keySubmitted, setKeySubmitted] = useState(false);
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

  const kind = STEPS[step];
  const isFinal = kind === "aha";

  const advance = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const canAdvance = useMemo(() => {
    switch (kind) {
      case "welcome":
        return true;
      case "key":
        return (
          state.apiKey.startsWith(PROVIDERS[state.provider].keyPrefix) &&
          state.apiKey.length >= 20
        );
      case "platforms":
        return state.platforms.length > 0;
      case "niche":
        return Boolean(state.nichePrimary);
      case "pitch":
        return state.channelPitch.trim().length >= 3;
      case "audience":
        return Boolean(state.audienceStage);
      case "goal":
        return Boolean(state.primaryGoal);
      case "formats":
        return state.videoFormats.length > 0;
      case "cadence":
        return Boolean(state.postingCadence);
      case "voice":
        return state.voiceTone.length > 0;
      case "inspirations":
        return state.inspirations.trim().length > 0;
      default:
        return false;
    }
  }, [kind, state]);

  const isOptional = kind !== "welcome" && kind !== "key" && !isFinal;

  const submitKey = async (): Promise<boolean> => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/onboarding/key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: state.provider,
          api_key: state.apiKey.trim(),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          (body as { message?: string }).message ??
          "Couldn't save that key. Try again.";
        toast.error(msg);
        return false;
      }
      setKeySubmitted(true);
      return true;
    } catch {
      toast.error("Network error. Try again.");
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const submitPreferences = async (): Promise<boolean> => {
    const payload = buildPreferencesPayload(kind, state);
    if (!payload) return true;

    setSubmitting(true);
    try {
      const res = await fetch("/api/onboarding/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        toast.error("Couldn't save that. Skipping.");
        return false;
      }
      return true;
    } catch {
      toast.error("Network error. Skipping.");
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = async () => {
    if (kind === "welcome") {
      advance();
      return;
    }
    if (kind === "key") {
      const ok = await submitKey();
      if (ok) advance();
      return;
    }
    if (isOptional) {
      await submitPreferences();
      advance();
    }
  };

  const handleSkipAll = () => {
    if (!keySubmitted) return;
    router.push("/dashboard");
  };

  const submitSeed = async (): Promise<{ chatId: string } | null> => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/onboarding/seed", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if ((body as { error?: string }).error === "insufficient_profile") {
          return null;
        }
        const msg =
          (body as { message?: string }).message ??
          "Couldn't generate your starter script.";
        toast.error(msg);
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
      <Header
        step={step}
        totalSteps={TOTAL_STEPS - 1}
        email={userEmail}
        canSkipAll={keySubmitted && !isFinal}
        onSkipAll={handleSkipAll}
      />

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
            {kind === "welcome" && <StepWelcome onNext={advance} />}
            {kind === "key" && (
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
            {kind === "platforms" && (
              <StepPlatforms
                value={state.platforms}
                onChange={(platforms) =>
                  setState((s) => ({ ...s, platforms }))
                }
              />
            )}
            {kind === "niche" && (
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
            {kind === "pitch" && (
              <StepPitch
                value={state.channelPitch}
                placeholder={derivePitchPlaceholder(state)}
                onChange={(channelPitch) =>
                  setState((s) => ({ ...s, channelPitch }))
                }
              />
            )}
            {kind === "audience" && (
              <StepAudience
                value={state.audienceStage}
                onChange={(audienceStage) =>
                  setState((s) => ({ ...s, audienceStage }))
                }
              />
            )}
            {kind === "goal" && (
              <StepGoal
                value={state.primaryGoal}
                onChange={(primaryGoal) =>
                  setState((s) => ({ ...s, primaryGoal }))
                }
              />
            )}
            {kind === "formats" && (
              <StepFormats
                value={state.videoFormats}
                onChange={(videoFormats) =>
                  setState((s) => ({ ...s, videoFormats }))
                }
              />
            )}
            {kind === "cadence" && (
              <StepCadence
                value={state.postingCadence}
                onChange={(postingCadence) =>
                  setState((s) => ({ ...s, postingCadence }))
                }
              />
            )}
            {kind === "voice" && (
              <StepVoice
                value={state.voiceTone}
                onChange={(voiceTone) =>
                  setState((s) => ({ ...s, voiceTone }))
                }
              />
            )}
            {kind === "inspirations" && (
              <StepInspirations
                value={state.inspirations}
                onChange={(inspirations) =>
                  setState((s) => ({ ...s, inspirations }))
                }
              />
            )}
            {kind === "aha" && (
              <StepAha
                state={state}
                submit={submitSeed}
                onDone={(chatId) =>
                  router.push(`/dashboard/chat/${chatId}`)
                }
                onFallback={() => router.push("/dashboard")}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer
        kind={kind}
        canAdvance={canAdvance}
        submitting={submitting}
        onBack={back}
        onNext={handleNext}
      />
    </div>
  );
}

function buildPreferencesPayload(
  kind: StepKind,
  state: OnboardingFlowState,
): Record<string, unknown> | null {
  switch (kind) {
    case "platforms":
      if (state.platforms.length === 0) return null;
      return { profile: { platforms: state.platforms } };
    case "niche":
      if (!state.nichePrimary) return null;
      return {
        profile: {
          niche_primary: state.nichePrimary,
          niche_secondary: state.nicheSecondary,
        },
      };
    case "pitch": {
      const pitch = state.channelPitch.trim();
      if (pitch.length < 3) return null;
      return { profile: { channel_pitch: pitch } };
    }
    case "audience":
      if (!state.audienceStage) return null;
      return { profile: { audience_stage: state.audienceStage } };
    case "goal":
      if (!state.primaryGoal) return null;
      return { profile: { primary_goal: state.primaryGoal } };
    case "formats": {
      if (state.videoFormats.length === 0) return null;
      const labels = state.videoFormats.map((f) => FORMAT_LABELS[f]);
      const content = [
        "# Video formats",
        "",
        "Formats this creator actually makes:",
        "",
        ...labels.map((label) => `- ${label}`),
      ].join("\n");
      return {
        memory: {
          path: "preferences/formats.md",
          title: "Video formats",
          content,
          autoload: true,
        },
      };
    }
    case "cadence": {
      if (!state.postingCadence) return null;
      const content = [
        "# Posting cadence",
        "",
        `Cadence: ${CADENCE_LABELS[state.postingCadence]}.`,
      ].join("\n");
      return {
        memory: {
          path: "preferences/cadence.md",
          title: "Posting cadence",
          content,
          autoload: true,
        },
      };
    }
    case "voice": {
      if (state.voiceTone.length === 0) return null;
      const labels = state.voiceTone.map((t) => VOICE_LABELS[t]);
      const content = [
        "# Voice and tone",
        "",
        `Match this voice: ${labels.join(" + ")}.`,
      ].join("\n");
      return {
        memory: {
          path: "preferences/voice.md",
          title: "Voice and tone",
          content,
          autoload: true,
        },
      };
    }
    case "inspirations": {
      const text = state.inspirations.trim();
      if (text.length === 0) return null;
      const content = [
        "# Inspirations",
        "",
        "Creators this user watches and admires:",
        "",
        text,
      ].join("\n");
      return {
        memory: {
          path: "preferences/inspirations.md",
          title: "Inspirations",
          content,
          autoload: true,
        },
      };
    }
    default:
      return null;
  }
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
  canSkipAll,
  onSkipAll,
}: {
  step: number;
  totalSteps: number;
  email: string | null;
  canSkipAll: boolean;
  onSkipAll: () => void;
}) {
  const pct = Math.min(100, (step / totalSteps) * 100);
  return (
    <header className="relative bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
        <span className="grid place-items-center size-7 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-primary/15 via-background to-background ring-1 ring-border/80">
          <LogoMark className="size-4" />
        </span>

        <LogoLockup iconClassName="hidden" />

        {canSkipAll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkipAll}
            className="ml-auto h-7 px-2 text-xs"
          >
            Skip rest, start chatting
          </Button>
        )}

        <span
          className={`text-xs tabular-nums text-muted-foreground ${
            canSkipAll ? "" : "ml-auto"
          }`}
        >
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
  kind,
  canAdvance,
  submitting,
  onBack,
  onNext,
}: {
  kind: StepKind;
  canAdvance: boolean;
  submitting: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  if (kind === "aha") return null;

  const nextLabel =
    kind === "key" ? "Save and continue" : "Save and next";

  return (
    <footer className="relative border-t border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-2 px-4 py-4 sm:px-6">
        <Button
          variant="outline"
          size="default"
          onClick={onBack}
          disabled={kind === "welcome" || submitting}
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
              {kind === "welcome" ? "Get started" : nextLabel}
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </div>
    </footer>
  );
}
