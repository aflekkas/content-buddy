"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CircularLoader } from "@/components/ui/loader";
import type { UserProfileRow } from "@/lib/db/types";

type Props = {
  profile: UserProfileRow;
};

const NICHE_MAX = 240;
const VOICE_MAX = 1000;
const SAMPLES_MAX = 12000;

function snapshotKey(state: {
  niche: string;
  voiceNotes: string;
  voiceSamples: string;
}) {
  return [state.niche.trim(), state.voiceNotes.trim(), state.voiceSamples.trim()].join(
    "|",
  );
}

export function ProfileForm({ profile }: Props) {
  const router = useRouter();
  const initialNiche = profile.niche ?? "";
  const initialVoiceNotes = profile.voice_notes ?? "";
  const initialVoiceSamples = profile.voice_samples ?? "";

  const [niche, setNiche] = useState(initialNiche);
  const [voiceNotes, setVoiceNotes] = useState(initialVoiceNotes);
  const [voiceSamples, setVoiceSamples] = useState(initialVoiceSamples);
  const [savedKey, setSavedKey] = useState(() =>
    snapshotKey({
      niche: initialNiche,
      voiceNotes: initialVoiceNotes,
      voiceSamples: initialVoiceSamples,
    }),
  );
  const [saving, setSaving] = useState(false);

  const currentKey = snapshotKey({ niche, voiceNotes, voiceSamples });
  const dirty = currentKey !== savedKey;

  async function onSave() {
    setSaving(true);
    try {
      const profileRes = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche: niche.trim() || null,
          voice_notes: voiceNotes.trim() || null,
          voice_samples: voiceSamples.trim() || null,
        }),
      });
      if (!profileRes.ok) throw new Error("profile_failed");

      setSavedKey(snapshotKey({ niche, voiceNotes, voiceSamples }));
      router.refresh();
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
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="profile-niche" className="text-sm font-medium">
            Niche
          </Label>
          <span className="text-xs text-muted-foreground">
            {niche.length}/{NICHE_MAX}
          </span>
        </div>
        <Input
          id="profile-niche"
          value={niche}
          maxLength={NICHE_MAX}
          onChange={(e) => setNiche(e.target.value.slice(0, NICHE_MAX))}
          placeholder="AI tools for indie founders"
        />
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="profile-voice" className="text-sm font-medium">
            Voice notes
          </Label>
          <span className="text-xs text-muted-foreground">
            {voiceNotes.length}/{VOICE_MAX}
          </span>
        </div>
        <Textarea
          id="profile-voice"
          value={voiceNotes}
          maxLength={VOICE_MAX}
          onChange={(e) => setVoiceNotes(e.target.value.slice(0, VOICE_MAX))}
          placeholder="Tone, phrasing, recurring topics."
          rows={5}
          className="min-h-32 leading-relaxed"
        />
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="profile-samples" className="text-sm font-medium">
            Voice samples
          </Label>
          <span className="text-xs text-muted-foreground">
            {voiceSamples.length}/{SAMPLES_MAX}
          </span>
        </div>
        <Textarea
          id="profile-samples"
          value={voiceSamples}
          maxLength={SAMPLES_MAX}
          onChange={(e) =>
            setVoiceSamples(e.target.value.slice(0, SAMPLES_MAX))
          }
          placeholder={
            "Paste 5-10 of your best LinkedIn posts. Separate with --- on its own line."
          }
          rows={12}
          className="min-h-60 leading-relaxed font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">
          Drafts get a lot closer to your voice when you paste real samples.
        </p>
      </section>

      <div className="flex items-center justify-end gap-3 border-t pt-4">
        {dirty && !saving && (
          <span className="text-xs text-muted-foreground">Unsaved changes</span>
        )}
        <Button
          onClick={() => void onSave()}
          disabled={saving || !dirty}
        >
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
