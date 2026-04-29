"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CircularLoader } from "@/components/ui/loader";
import { cn } from "@/lib/utils";
import type { HookRow } from "@/lib/db/types";

type Props = {
  initialHooks: HookRow[];
};

export function HooksGrid({ initialHooks }: Props) {
  const router = useRouter();
  const [hooks, setHooks] = useState<HookRow[]>(initialHooks);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");
  const [draftTags, setDraftTags] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return hooks;
    return hooks.filter(
      (h) =>
        h.text.toLowerCase().includes(q) ||
        h.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [hooks, query]);

  async function createHook() {
    const text = draft.trim();
    if (text.length < 1) return;
    setCreating(true);
    try {
      const tags = draftTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 10);
      const res = await fetch("/api/hooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, tags }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const hook = (await res.json()) as HookRow;
      setHooks((prev) => [hook, ...prev]);
      setDraft("");
      setDraftTags("");
    } catch {
      toast.error("Couldn't save hook");
    } finally {
      setCreating(false);
    }
  }

  async function patchHook(id: string, patch: Partial<HookRow>) {
    const res = await fetch(`/api/hooks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      toast.error("Save failed");
      return null;
    }
    const updated = (await res.json()) as HookRow;
    setHooks((prev) => prev.map((h) => (h.id === id ? updated : h)));
    return updated;
  }

  async function removeHook(id: string) {
    const prev = hooks;
    setHooks((curr) => curr.filter((h) => h.id !== id));
    const res = await fetch(`/api/hooks/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setHooks(prev);
      toast.error("Couldn't delete hook");
    }
  }

  async function promoteToVideo(hook: HookRow) {
    try {
      const res = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: hook.text.slice(0, 80) || "Untitled video",
          hook: hook.text,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const video = (await res.json()) as { id: string };
      router.push(`/dashboard/videos/${video.id}`);
    } catch {
      toast.error("Couldn't create video");
    }
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col gap-6 px-4 py-6 md:py-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Hook library</h1>
          <p className="text-sm text-muted-foreground">
            Reusable opening lines you (or the assistant) can pull into any video.
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by text or tag…"
          className="pl-9 pr-8"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-3">
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          New hook
        </div>
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="The opening line that stops the scroll."
          maxLength={500}
          className="min-h-16"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Input
            value={draftTags}
            onChange={(e) => setDraftTags(e.target.value)}
            placeholder="tags, comma separated"
            className="h-8 max-w-xs text-sm"
          />
          <span className="text-[11px] text-muted-foreground">
            {draft.length}/500
          </span>
          <Button
            size="sm"
            className="ml-auto"
            onClick={createHook}
            disabled={creating || draft.trim().length === 0}
          >
            <Plus className="size-3.5" />
            {creating ? "Saving…" : "Save hook"}
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {hooks.length === 0
            ? "No hooks yet. Save one above, or ask the assistant to save hooks during a chat."
            : "No matches for that search."}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((hook) => (
            <HookCard
              key={hook.id}
              hook={hook}
              onPatch={(patch) => patchHook(hook.id, patch)}
              onDelete={() => removeHook(hook.id)}
              onPromote={() => promoteToVideo(hook)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

type HookCardProps = {
  hook: HookRow;
  onPatch: (patch: Partial<HookRow>) => Promise<HookRow | null>;
  onDelete: () => void | Promise<void>;
  onPromote: () => void | Promise<void>;
};

function HookCard({ hook, onPatch, onDelete, onPromote }: HookCardProps) {
  const [text, setText] = useState(hook.text);
  const [tagsRaw, setTagsRaw] = useState(hook.tags.join(", "));
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 10);
    const next = await onPatch({ text: text.trim(), tags });
    setSaving(false);
    if (next) setEditing(false);
  }

  function cancel() {
    setText(hook.text);
    setTagsRaw(hook.tags.join(", "));
    setEditing(false);
  }

  return (
    <li
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-border bg-card p-3 text-sm",
      )}
    >
      {editing ? (
        <>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            className="min-h-16"
          />
          <Input
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
            placeholder="tags, comma separated"
            className="h-8 text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={cancel} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? (
                <>
                  <CircularLoader size="sm" />
                  Saving…
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-left"
          >
            <p className="text-sm leading-5 text-foreground">{hook.text}</p>
          </button>
          {hook.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {hook.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
          <div className="mt-auto flex items-center justify-end gap-1 pt-1">
            <Button size="sm" variant="ghost" onClick={onPromote}>
              <Sparkles className="size-3.5" />
              Use as video
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => void onDelete()}
              aria-label="Delete hook"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </>
      )}
    </li>
  );
}
