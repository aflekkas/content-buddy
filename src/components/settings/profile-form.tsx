"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import {
  NICHES,
  ONBOARDING_PLATFORMS,
  type OnboardingPlatform,
} from "@/lib/niches";
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

export function ProfileForm({ profile }: Props) {
  const router = useRouter();
  const [platforms, setPlatforms] = useState<OnboardingPlatform[]>(
    (profile.platforms ?? []) as OnboardingPlatform[],
  );
  const [niche, setNiche] = useState(profile.niche_primary ?? "");
  const [pitch, setPitch] = useState(profile.channel_pitch ?? "");
  const [audience, setAudience] = useState<AudienceStage | "">(
    profile.audience_stage ?? "",
  );
  const [goal, setGoal] = useState<PrimaryGoal | "">(profile.primary_goal ?? "");
  const [saving, setSaving] = useState(false);

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
      toast.success("Profile updated");
      router.refresh();
    } catch {
      toast.error("Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>Platforms</Label>
        <div className="flex flex-wrap gap-1.5">
          {ONBOARDING_PLATFORMS.map((p) => {
            const active = platforms.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => togglePlatform(p.id)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
      </div>

      <SelectField
        id="profile-goal"
        label="Primary goal"
        value={goal}
        onValueChange={(v) => setGoal(v as PrimaryGoal)}
        options={GOAL_OPTIONS}
      />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="profile-pitch">Channel pitch</Label>
        <Textarea
          id="profile-pitch"
          value={pitch}
          onChange={(e) => setPitch(e.target.value.slice(0, PITCH_MAX))}
          placeholder="One sentence on what your channel is and who it's for"
          rows={3}
        />
        <p className="text-right text-xs text-muted-foreground">
          {pitch.length}/{PITCH_MAX}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={() => void onSave()} disabled={saving} size="sm">
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
