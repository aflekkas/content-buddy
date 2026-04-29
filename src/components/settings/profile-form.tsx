"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { CircularLoader } from "@/components/ui/loader";
import {
  NICHES,
  ONBOARDING_PLATFORMS,
  type OnboardingPlatform,
} from "@/lib/niches";
import { getPlatformLogo } from "@/components/brand/platform-logos";
import type {
  AudienceStage,
  PrimaryGoal,
  UserProfileRow,
} from "@/lib/db/types";
import { cn } from "@/lib/utils";

type Props = {
  profile: UserProfileRow;
};

const PITCH_MAX = 500;

const AUDIENCE_OPTIONS: { value: AudienceStage; label: string }[] = [
  { value: "starting", label: "Starting (0-1k)" },
  { value: "growing", label: "Growing (1k-10k)" },
  { value: "established", label: "Established (10k-100k)" },
  { value: "large", label: "Large (100k+)" },
];

const GOAL_OPTIONS: { value: PrimaryGoal; label: string }[] = [
  { value: "grow", label: "Grow followers" },
  { value: "monetize", label: "Monetize" },
  { value: "brand", label: "Build personal brand" },
  { value: "traffic", label: "Drive off-platform traffic" },
  { value: "experiment", label: "Experiment" },
];

function snapshotKey(state: {
  platforms: string[];
  niche: string;
  pitch: string;
  audience: string;
  goal: string;
}) {
  return [
    [...state.platforms].sort().join(","),
    state.niche,
    state.pitch.trim(),
    state.audience,
    state.goal,
  ].join("|");
}

export function ProfileForm({ profile }: Props) {
  const initialPlatforms = (profile.platforms ?? []) as OnboardingPlatform[];
  const initialNiche = profile.niche_primary ?? "";
  const initialPitch = profile.channel_pitch ?? "";
  const initialAudience = profile.audience_stage ?? "";
  const initialGoal = profile.primary_goal ?? "";

  const [platforms, setPlatforms] =
    useState<OnboardingPlatform[]>(initialPlatforms);
  const [niche, setNiche] = useState(initialNiche);
  const [pitch, setPitch] = useState(initialPitch);
  const [audience, setAudience] = useState<AudienceStage | "">(initialAudience);
  const [goal, setGoal] = useState<PrimaryGoal | "">(initialGoal);
  const [savedKey, setSavedKey] = useState(() =>
    snapshotKey({
      platforms: initialPlatforms,
      niche: initialNiche,
      pitch: initialPitch,
      audience: initialAudience,
      goal: initialGoal,
    }),
  );
  const [saving, setSaving] = useState(false);

  const currentKey = snapshotKey({ platforms, niche, pitch, audience, goal });
  const dirty = currentKey !== savedKey;

  function togglePlatform(id: OnboardingPlatform) {
    setPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  async function onSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/onboarding/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: {
            platforms,
            niche_primary: niche || null,
            channel_pitch: pitch.trim() || undefined,
            audience_stage: audience || null,
            primary_goal: goal || null,
          },
        }),
      });
      if (!res.ok) throw new Error("save_failed");
      setSavedKey(currentKey);
      toast.success("Profile updated");
    } catch {
      toast.error("Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <Label className="text-sm font-medium">Platforms</Label>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {ONBOARDING_PLATFORMS.map((p) => {
            const active = platforms.includes(p.id);
            const Logo = getPlatformLogo(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => togglePlatform(p.id)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                  active
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                )}
              >
                <Logo className="size-4 shrink-0" />
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SelectField
          id="profile-niche"
          label="Primary niche"
          value={niche}
          onValueChange={setNiche}
          options={NICHES.map((n) => ({
            value: n.id,
            label: `${n.emoji} ${n.label}`,
          }))}
        />
        <SelectField
          id="profile-audience"
          label="Audience stage"
          value={audience}
          onValueChange={(v) => setAudience(v as AudienceStage)}
          options={AUDIENCE_OPTIONS}
        />
        <div className="sm:col-span-2">
          <SelectField
            id="profile-goal"
            label="Primary goal"
            value={goal}
            onValueChange={(v) => setGoal(v as PrimaryGoal)}
            options={GOAL_OPTIONS}
          />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="profile-pitch" className="text-sm font-medium">
            Channel pitch
          </Label>
          <span className="text-xs text-muted-foreground">
            {pitch.length}/{PITCH_MAX}
          </span>
        </div>
        <Textarea
          id="profile-pitch"
          value={pitch}
          onChange={(e) => setPitch(e.target.value.slice(0, PITCH_MAX))}
          placeholder="One sentence on what your channel is and who it's for"
          rows={3}
          className="leading-relaxed"
        />
      </section>

      <div className="flex items-center justify-end gap-3 border-t pt-4">
        {dirty && !saving && (
          <span className="text-xs text-muted-foreground">Unsaved changes</span>
        )}
        <Button onClick={() => void onSave()} disabled={saving || !dirty}>
          {saving ? (
            <>
              <CircularLoader size="sm" />
              Saving...
            </>
          ) : (
            "Save"
          )}
        </Button>
      </div>
    </div>
  );
}
