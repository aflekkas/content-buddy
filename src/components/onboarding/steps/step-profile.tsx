"use client";

import type { Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";
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

const HANDLE_RE = /^@?[A-Za-z0-9_]{1,15}$/;
const NICHE_MAX = 240;
const VOICE_MAX = 1000;

export function StepProfile({ state, setState, onContinue }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedHandle = useMemo(
    () => normalizeHandle(state.ownHandle),
    [state.ownHandle],
  );
  const handleValid = HANDLE_RE.test(state.ownHandle.trim());
  const canSave =
    state.niche.trim().length > 0 &&
    state.voiceNotes.trim().length > 0 &&
    handleValid &&
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
        }),
      });

      if (!profileRes.ok) throw new Error("profile_failed");

      const sourceRes = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "x_self",
          handle: normalizedHandle,
        }),
      });

      if (!sourceRes.ok) throw new Error("source_failed");

      setState((current) => ({ ...current, ownHandle: normalizedHandle }));
      onContinue();
    } catch {
      setError("Could not save your profile and X handle.");
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
            Give the synthesizer a niche, a voice, and your own X account.
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
            placeholder="Tone, phrasing, recurring topics"
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
          <Label htmlFor="profile-handle">Your X handle</Label>
          <Input
            id="profile-handle"
            value={state.ownHandle}
            aria-invalid={state.ownHandle.trim().length > 0 && !handleValid}
            placeholder="@yourhandle"
            onChange={(event) =>
              setState((current) => ({
                ...current,
                ownHandle: event.target.value,
              }))
            }
          />
          <p className="text-xs text-muted-foreground">
            Saved as @{normalizedHandle || "handle"}.
          </p>
        </section>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex justify-end border-t pt-4">
          <Button type="button" disabled={!canSave} onClick={() => void saveProfile()}>
            {saving ? <CircularLoader size="sm" /> : null}
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

function normalizeHandle(value: string) {
  return value.trim().replace(/^@/, "").toLowerCase();
}
