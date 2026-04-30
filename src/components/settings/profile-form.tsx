"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CircularLoader } from "@/components/ui/loader";
import type { MonitoredSourceRow, UserProfileRow } from "@/lib/db/types";

type Props = {
  profile: UserProfileRow;
};

const HANDLE_RE = /^@?[A-Za-z0-9_]{1,15}$/;
const NICHE_MAX = 240;
const VOICE_MAX = 1000;
const SOURCE_LIMIT = 10;

function normalizeHandle(value: string) {
  return value.trim().replace(/^@+/, "").toLowerCase();
}

function isValidHandle(value: string) {
  const trimmed = value.trim();
  return trimmed.length === 0 || HANDLE_RE.test(trimmed);
}

function snapshotKey(state: {
  niche: string;
  voiceNotes: string;
  ownHandle: string;
}) {
  return [
    state.niche.trim(),
    state.voiceNotes.trim(),
    normalizeHandle(state.ownHandle),
  ].join("|");
}

export function ProfileForm({ profile }: Props) {
  const router = useRouter();
  const initialNiche = profile.niche ?? "";
  const initialVoiceNotes = profile.voice_notes ?? "";

  const [niche, setNiche] = useState(initialNiche);
  const [voiceNotes, setVoiceNotes] = useState(initialVoiceNotes);
  const [ownHandle, setOwnHandle] = useState("");
  const [savedKey, setSavedKey] = useState(() =>
    snapshotKey({ niche: initialNiche, voiceNotes: initialVoiceNotes, ownHandle: "" }),
  );
  const [sources, setSources] = useState<MonitoredSourceRow[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sourceSaving, setSourceSaving] = useState(false);
  const [removingSourceId, setRemovingSourceId] = useState<string | null>(null);
  const [newHandle, setNewHandle] = useState("");
  const [confirmingHandleChange, setConfirmingHandleChange] = useState(false);

  const ownSource = useMemo(
    () => sources.find((source) => source.kind === "x_self") ?? null,
    [sources],
  );
  const nicheSources = useMemo(
    () => sources.filter((source) => source.kind === "x_account"),
    [sources],
  );
  const handleValid = isValidHandle(ownHandle);
  const newHandleValid = newHandle.trim().length === 0 || HANDLE_RE.test(newHandle.trim());
  const currentKey = snapshotKey({ niche, voiceNotes, ownHandle });
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
        const self = rows.find((source) => source.kind === "x_self");
        const nextHandle = self?.handle ?? "";
        setOwnHandle(nextHandle);
        setSavedKey(
          snapshotKey({
            niche: initialNiche,
            voiceNotes: initialVoiceNotes,
            ownHandle: nextHandle,
          }),
        );
      } catch {
        if (!cancelled) toast.error("Could not load X sources");
      } finally {
        if (!cancelled) setSourcesLoading(false);
      }
    }

    void loadSources();

    return () => {
      cancelled = true;
    };
  }, [initialNiche, initialVoiceNotes]);

  async function onSave(confirmedHandleChange = false) {
    if (!handleValid) {
      toast.error("Enter a valid X handle");
      return;
    }

    const normalizedOwnHandle = normalizeHandle(ownHandle);
    const savedOwnHandle = ownSource?.handle ?? "";

    if (
      ownSource &&
      normalizedOwnHandle !== savedOwnHandle &&
      !confirmedHandleChange
    ) {
      setConfirmingHandleChange(true);
      return;
    }

    setSaving(true);
    try {
      const profileRes = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche: niche.trim() || null,
          voice_notes: voiceNotes.trim() || null,
        }),
      });
      if (!profileRes.ok) throw new Error("profile_failed");

      let nextSources = sources;

      if (normalizedOwnHandle !== savedOwnHandle) {
        if (ownSource) {
          const deleteRes = await fetch(`/api/sources/${ownSource.id}`, {
            method: "DELETE",
          });
          if (!deleteRes.ok) throw new Error("source_delete_failed");
          nextSources = nextSources.filter((source) => source.id !== ownSource.id);
        }

        if (normalizedOwnHandle) {
          const createRes = await fetch("/api/sources", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              kind: "x_self",
              handle: normalizedOwnHandle,
            }),
          });
          if (!createRes.ok) throw new Error("source_create_failed");
          const created: MonitoredSourceRow = await createRes.json();
          nextSources = [created, ...nextSources];
        }
      }

      setSources(nextSources);
      setOwnHandle(normalizedOwnHandle);
      setSavedKey(
        snapshotKey({
          niche,
          voiceNotes,
          ownHandle: normalizedOwnHandle,
        }),
      );
      router.refresh();
      toast.success("Profile updated");
    } catch {
      toast.error("Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  async function addSource() {
    if (nicheSources.length >= SOURCE_LIMIT) return;
    if (!HANDLE_RE.test(newHandle.trim())) {
      toast.error("Enter a valid X handle");
      return;
    }

    const normalized = normalizeHandle(newHandle);
    if (nicheSources.some((source) => source.handle === normalized)) {
      toast.error("That source is already monitored");
      return;
    }

    setSourceSaving(true);
    try {
      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "x_account",
          handle: normalized,
        }),
      });
      if (!res.ok) throw new Error("source_create_failed");
      const created: MonitoredSourceRow = await res.json();
      setSources((current) => [created, ...current]);
      setNewHandle("");
      router.refresh();
      toast.success("Source added");
    } catch {
      toast.error("Could not add source");
    } finally {
      setSourceSaving(false);
    }
  }

  async function removeSource(source: MonitoredSourceRow) {
    setRemovingSourceId(source.id);
    try {
      const res = await fetch(`/api/sources/${source.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("source_delete_failed");
      setSources((current) => current.filter((item) => item.id !== source.id));
      router.refresh();
      toast.success("Source removed");
    } catch {
      toast.error("Could not remove source");
    } finally {
      setRemovingSourceId(null);
    }
  }

  return (
    <>
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
          placeholder="Tone, phrasing, and style notes the assistant should preserve"
          rows={5}
          className="min-h-32 leading-relaxed"
        />
      </section>

      <section className="flex flex-col gap-2">
        <Label htmlFor="profile-handle" className="text-sm font-medium">
          Your X handle
        </Label>
        <Input
          id="profile-handle"
          value={ownHandle}
          maxLength={16}
          aria-invalid={ownHandle.trim().length > 0 && !handleValid}
          onChange={(e) => setOwnHandle(e.target.value)}
          placeholder="@yourhandle"
        />
        {ownHandle.trim().length > 0 && !handleValid ? (
          <p className="text-xs text-destructive">
            Use 1-15 letters, numbers, or underscores.
          </p>
        ) : ownSource ? (
          <p className="text-xs text-muted-foreground">
            Changing this deletes the old source row before creating a new one.
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-3 rounded-xl border bg-background p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium">Niche accounts you monitor</h3>
            <p className="text-xs text-muted-foreground">
              {nicheSources.length} of {SOURCE_LIMIT}
            </p>
          </div>
        </div>

        {sourcesLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CircularLoader size="sm" />
            Loading sources...
          </div>
        ) : nicheSources.length > 0 ? (
          <div className="divide-y rounded-lg border">
            {nicheSources.map((source) => (
              <div
                key={source.id}
                className="flex items-center gap-3 px-3 py-2"
              >
                <span className="min-w-0 flex-1 truncate font-mono text-sm">
                  @{source.handle}
                </span>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Remove @${source.handle}`}
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
            No niche accounts added yet.
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={newHandle}
            maxLength={16}
            aria-invalid={newHandle.trim().length > 0 && !newHandleValid}
            placeholder="@founder"
            disabled={nicheSources.length >= SOURCE_LIMIT}
            onChange={(e) => setNewHandle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void addSource();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={
              sourceSaving ||
              nicheSources.length >= SOURCE_LIMIT ||
              newHandle.trim().length === 0
            }
            onClick={() => void addSource()}
          >
            {sourceSaving ? <CircularLoader size="sm" /> : <Plus className="size-4" />}
            Add
          </Button>
        </div>
        {newHandle.trim().length > 0 && !newHandleValid ? (
          <p className="text-xs text-destructive">
            Use 1-15 letters, numbers, or underscores.
          </p>
        ) : null}
      </section>

      <div className="flex items-center justify-end gap-3 border-t pt-4">
        {dirty && !saving && (
          <span className="text-xs text-muted-foreground">Unsaved changes</span>
        )}
        <Button
          onClick={() => void onSave()}
          disabled={saving || sourcesLoading || !dirty || !handleValid}
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
    <ConfirmDialog
      open={confirmingHandleChange}
      onOpenChange={setConfirmingHandleChange}
      title="Changing your X handle removes prior fetch history."
      description="The old source row will be deleted before the new handle is added."
      confirmLabel="Change handle"
      onConfirm={() => onSave(true)}
    />
    </>
  );
}
