"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CircularLoader } from "@/components/ui/loader";
import type { UserProfileRow } from "@/lib/db/types";

type Props = {
  profile: UserProfileRow;
};

const NICHE_MAX = 240;
const VOICE_MAX = 1000;

function snapshotKey(state: { niche: string; voiceNotes: string }) {
  return [state.niche.trim(), state.voiceNotes.trim()].join("|");
}

export function ProfileForm({ profile }: Props) {
  const initialNiche = profile.niche ?? "";
  const initialVoiceNotes = profile.voice_notes ?? "";

  const [niche, setNiche] = useState(initialNiche);
  const [voiceNotes, setVoiceNotes] = useState(initialVoiceNotes);
  const [savedKey, setSavedKey] = useState(() =>
    snapshotKey({ niche: initialNiche, voiceNotes: initialVoiceNotes }),
  );
  const [saving, setSaving] = useState(false);

  const currentKey = snapshotKey({ niche, voiceNotes });
  const dirty = currentKey !== savedKey;

  async function onSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/onboarding/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: {
            niche: niche.trim() || null,
            voice_notes: voiceNotes.trim() || null,
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
        <div className="flex items-center justify-between">
          <Label htmlFor="profile-niche" className="text-sm font-medium">
            Niche
          </Label>
          <span className="text-xs text-muted-foreground">
            {niche.length}/{NICHE_MAX}
          </span>
        </div>
        <Textarea
          id="profile-niche"
          value={niche}
          onChange={(e) => setNiche(e.target.value.slice(0, NICHE_MAX))}
          placeholder="The audience, market, or topic you write about"
          rows={3}
          className="leading-relaxed"
        />
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
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
          onChange={(e) => setVoiceNotes(e.target.value.slice(0, VOICE_MAX))}
          placeholder="Tone, phrasing, and style notes the assistant should preserve"
          rows={5}
          className="min-h-32 leading-relaxed"
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
