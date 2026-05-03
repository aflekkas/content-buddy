"use client";

import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import type { OnboardingState } from "@/components/onboarding/onboarding-flow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CircularLoader } from "@/components/ui/loader";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  state: OnboardingState;
  setState: Dispatch<SetStateAction<OnboardingState>>;
  onContinue: () => void;
};

const NICHE_MAX = 240;
const VOICE_MAX = 1000;
const SAMPLES_MAX = 12000;

export function StepProfile({ state, setState, onContinue }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave =
    state.niche.trim().length > 0 &&
    state.voiceNotes.trim().length > 0 &&
    !saving;

  async function saveProfile() {
    if (!canSave) return;

    setSaving(true);
    setError(null);

    try {
      const profileRes = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche: state.niche.trim(),
          voice_notes: state.voiceNotes.trim(),
          voice_samples: state.voiceSamples.trim() || null,
        }),
      });

      if (!profileRes.ok) throw new Error("profile_failed");

      onContinue();
    } catch {
      setError("Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-background p-6 shadow-sm">
      <div className="flex flex-col gap-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Shape the drafts
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Tell us your niche, your voice, and paste a few of your best posts
            so drafts sound like you.
          </p>
        </div>

        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="profile-niche">Niche</Label>
            <span className="text-xs text-muted-foreground">
              {state.niche.length}/{NICHE_MAX}
            </span>
          </div>
          <Input
            id="profile-niche"
            value={state.niche}
            maxLength={NICHE_MAX}
            placeholder="AI tools for indie founders"
            onChange={(event) =>
              setState((current) => ({
                ...current,
                niche: event.target.value.slice(0, NICHE_MAX),
              }))
            }
          />
        </section>

        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="profile-voice">Voice notes</Label>
            <span className="text-xs text-muted-foreground">
              {state.voiceNotes.length}/{VOICE_MAX}
            </span>
          </div>
          <Textarea
            id="profile-voice"
            value={state.voiceNotes}
            maxLength={VOICE_MAX}
            rows={5}
            placeholder="Tone, phrasing, recurring topics. e.g. dry, concrete, ships fast, no buzzwords."
            className="min-h-32 leading-relaxed"
            onChange={(event) =>
              setState((current) => ({
                ...current,
                voiceNotes: event.target.value.slice(0, VOICE_MAX),
              }))
            }
          />
        </section>

        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="profile-samples">
              Voice samples{" "}
              <span className="font-normal text-muted-foreground">
                (optional, recommended)
              </span>
            </Label>
            <span className="text-xs text-muted-foreground">
              {state.voiceSamples.length}/{SAMPLES_MAX}
            </span>
          </div>
          <Textarea
            id="profile-samples"
            value={state.voiceSamples}
            maxLength={SAMPLES_MAX}
            rows={12}
            placeholder={"Paste 5-10 of your best LinkedIn posts. Separate with --- on its own line.\n\n---\n"}
            className="min-h-60 leading-relaxed font-mono text-xs"
            onChange={(event) =>
              setState((current) => ({
                ...current,
                voiceSamples: event.target.value.slice(0, SAMPLES_MAX),
              }))
            }
          />
          <p className="text-xs text-muted-foreground">
            Skip if you want, but drafts get a lot closer to your voice when
            you paste real samples.
          </p>
        </section>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex justify-end border-t pt-4">
          <Button
            type="button"
            disabled={!canSave}
            onClick={() => void saveProfile()}
          >
            {saving ? <CircularLoader size="sm" /> : null}
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
