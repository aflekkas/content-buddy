"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CircularLoader } from "@/components/ui/loader";
import type { MonitoredSourceRow, UserProfileRow } from "@/lib/db/types";

type Props = {
  profile: UserProfileRow;
};

const NICHE_MAX = 240;
const VOICE_MAX = 1000;
const SAMPLES_MAX = 12000;
const FEED_LIMIT = 20;

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
  const [sources, setSources] = useState<MonitoredSourceRow[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [feedSaving, setFeedSaving] = useState(false);
  const [removingSourceId, setRemovingSourceId] = useState<string | null>(null);
  const [newFeed, setNewFeed] = useState("");

  const rssFeeds = useMemo(
    () => sources.filter((source) => source.kind === "rss_feed"),
    [sources],
  );

  const currentKey = snapshotKey({ niche, voiceNotes, voiceSamples });
  const dirty = currentKey !== savedKey;

  useEffect(() => {
    let cancelled = false;
    async function loadSources() {
      setSourcesLoading(true);
      try {
        const res = await fetch("/api/sources");
        if (!res.ok) throw new Error("load_failed");
        const rows: MonitoredSourceRow[] = await res.json();
        if (cancelled) return;
        setSources(rows);
      } catch {
        if (!cancelled) toast.error("Could not load feeds");
      } finally {
        if (!cancelled) setSourcesLoading(false);
      }
    }
    void loadSources();
    return () => {
      cancelled = true;
    };
  }, []);

  async function addFeed() {
    const url = newFeed.trim();
    if (!url) return;
    if (rssFeeds.length >= FEED_LIMIT) return;
    if (!/^https?:\/\//i.test(url)) {
      toast.error("Paste a full feed URL (https://...)");
      return;
    }
    setFeedSaving(true);
    try {
      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "rss_feed", url }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        const reason =
          detail?.failures?.[0]?.reason ?? detail?.message ?? "create_failed";
        toast.error(`Could not add feed: ${reason}`);
        return;
      }
      const created: MonitoredSourceRow = await res.json();
      setSources((current) => [created, ...current]);
      setNewFeed("");
      toast.success("Feed added");
    } catch {
      toast.error("Could not add feed");
    } finally {
      setFeedSaving(false);
    }
  }

  async function removeSource(source: MonitoredSourceRow) {
    setRemovingSourceId(source.id);
    try {
      const res = await fetch(`/api/sources/${source.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("source_delete_failed");
      setSources((current) => current.filter((item) => item.id !== source.id));
      toast.success("Feed removed");
    } catch {
      toast.error("Could not remove feed");
    } finally {
      setRemovingSourceId(null);
    }
  }

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

      <section className="flex flex-col gap-3 rounded-xl border bg-background p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium">News feeds</h3>
            <p className="text-xs text-muted-foreground">
              {rssFeeds.length} of {FEED_LIMIT}
            </p>
          </div>
        </div>

        {sourcesLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CircularLoader size="sm" />
            Loading feeds...
          </div>
        ) : rssFeeds.length > 0 ? (
          <div className="divide-y rounded-lg border">
            {rssFeeds.map((source) => (
              <div
                key={source.id}
                className="flex items-center gap-3 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {source.handle}
                  </div>
                  {source.url ? (
                    <div className="truncate font-mono text-xs text-muted-foreground">
                      {source.url}
                    </div>
                  ) : null}
                </div>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Remove ${source.handle}`}
                  disabled={removingSourceId === source.id}
                  onClick={() => void removeSource(source)}
                >
                  {removingSourceId === source.id ? (
                    <CircularLoader size="sm" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
            No feeds yet. Paste an RSS URL below.
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={newFeed}
            placeholder="https://hnrss.org/frontpage"
            disabled={rssFeeds.length >= FEED_LIMIT}
            onChange={(e) => setNewFeed(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void addFeed();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={
              feedSaving ||
              rssFeeds.length >= FEED_LIMIT ||
              newFeed.trim().length === 0
            }
            onClick={() => void addFeed()}
          >
            {feedSaving ? (
              <CircularLoader size="sm" />
            ) : (
              <Plus className="size-4" />
            )}
            Add
          </Button>
        </div>
      </section>

      <div className="flex items-center justify-end gap-3 border-t pt-4">
        {dirty && !saving && (
          <span className="text-xs text-muted-foreground">Unsaved changes</span>
        )}
        <Button
          onClick={() => void onSave()}
          disabled={saving || sourcesLoading || !dirty}
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
