"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ExternalLink, Eye, EyeOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProviderIcon } from "@/components/ui/provider-icon";
import {
  PROVIDER_IDS,
  PROVIDERS,
  type ProviderId,
} from "@/lib/providers";
import type { ProviderKeyMetaRow } from "@/lib/db/types";
import { cn } from "@/lib/utils";

type Active = { provider: ProviderId; model: string };

type Props = {
  initialKeys: ProviderKeyMetaRow[];
  initialActive: Active;
};

export function KeysForm({ initialKeys, initialActive }: Props) {
  const [keys, setKeys] = useState<Record<string, ProviderKeyMetaRow>>(() => {
    const map: Record<string, ProviderKeyMetaRow> = {};
    for (const k of initialKeys) map[k.provider] = k;
    return map;
  });
  const [active, setActive] = useState<Active>(initialActive);
  const [savingActive, setSavingActive] = useState(false);

  const activeProviderHasKey = Boolean(keys[active.provider]);

  async function changeActive(next: Active) {
    setSavingActive(true);
    try {
      const res = await fetch("/api/settings/active-model", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!res.ok) throw new Error("save_failed");
      setActive(next);
      toast.success(`Now using ${PROVIDERS[next.provider].label}`);
    } catch {
      toast.error("Could not change model");
    } finally {
      setSavingActive(false);
    }
  }

  function onProviderChange(provider: ProviderId) {
    const firstModel = PROVIDERS[provider].models[0].id;
    void changeActive({ provider, model: firstModel });
  }

  function onModelChange(model: string) {
    void changeActive({ provider: active.provider, model });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border bg-card p-4">
        <h2 className="text-sm font-medium">Active model</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Which provider and model your chats use. Changing this saves
          immediately.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="active-provider" className="text-xs">
              Provider
            </Label>
            <select
              id="active-provider"
              value={active.provider}
              onChange={(e) => onProviderChange(e.target.value as ProviderId)}
              disabled={savingActive}
              className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {PROVIDER_IDS.map((p) => (
                <option key={p} value={p}>
                  {PROVIDERS[p].label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="active-model" className="text-xs">
              Model
            </Label>
            <select
              id="active-model"
              value={active.model}
              onChange={(e) => onModelChange(e.target.value)}
              disabled={savingActive}
              className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {PROVIDERS[active.provider].models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!activeProviderHasKey && (
          <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
            No key saved for {PROVIDERS[active.provider].label}. Add one below
            or chats will fail until you do.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">API keys</h2>
        {PROVIDER_IDS.map((p) => (
          <ProviderKeyCard
            key={p}
            provider={p}
            meta={keys[p] ?? null}
            onSaved={(meta) => setKeys((prev) => ({ ...prev, [p]: meta }))}
            onCleared={() =>
              setKeys((prev) => {
                const next = { ...prev };
                delete next[p];
                return next;
              })
            }
          />
        ))}
      </section>
    </div>
  );
}

function ProviderKeyCard({
  provider,
  meta,
  onSaved,
  onCleared,
}: {
  provider: ProviderId;
  meta: ProviderKeyMetaRow | null;
  onSaved: (m: ProviderKeyMetaRow) => void;
  onCleared: () => void;
}) {
  const info = PROVIDERS[provider];
  const [editing, setEditing] = useState(!meta);
  const [keyText, setKeyText] = useState("");
  const [showPlain, setShowPlain] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function handleSave() {
    const trimmed = keyText.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith(info.keyPrefix)) {
      toast.error(`Key should start with ${info.keyPrefix}`);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/settings/keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, key: trimmed }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        if (body?.error === "wrong_prefix") {
          toast.error(`Key should start with ${body.expected}`);
        } else {
          toast.error("Could not save key");
        }
        return;
      }
      const next: ProviderKeyMetaRow = await res.json();
      onSaved(next);
      setKeyText("");
      setEditing(false);
      toast.success(`${info.label} key saved`);
    } catch {
      toast.error("Could not save key");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      const res = await fetch("/api/settings/keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      if (!res.ok) throw new Error("delete_failed");
      onCleared();
      setEditing(true);
      toast.success(`${info.label} key removed`);
    } catch {
      toast.error("Could not remove key");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <ProviderIcon provider={provider} size={28} />
          <div className="flex flex-col">
            <span className="text-sm font-medium">{info.label}</span>
            <a
              href={info.consoleUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Get key <ExternalLink className="size-3" />
            </a>
          </div>
        </div>
        {meta && (
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-400">
            <Check className="size-3" />
            saved
          </div>
        )}
      </div>

      {meta && !editing && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
          <span className="font-mono text-muted-foreground">
            …{meta.last4}
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(true)}
              disabled={removing}
            >
              Replace
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void handleRemove()}
              disabled={removing}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 />
              Remove
            </Button>
          </div>
        </div>
      )}

      {(editing || !meta) && (
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Input
              type={showPlain ? "text" : "password"}
              value={keyText}
              onChange={(e) => setKeyText(e.target.value)}
              placeholder={`${info.keyPrefix}…`}
              className={cn("font-mono text-sm bg-background")}
              spellCheck={false}
              autoComplete="off"
            />
            <Button
              size="icon-sm"
              variant="ghost"
              type="button"
              onClick={() => setShowPlain((v) => !v)}
              aria-label={showPlain ? "Hide key" : "Show key"}
            >
              {showPlain ? <EyeOff /> : <Eye />}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => void handleSave()}
              disabled={saving || !keyText.trim()}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
            {meta && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setKeyText("");
                  setEditing(false);
                }}
                disabled={saving}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function SettingsLink() {
  return <Link href="/settings">Settings</Link>;
}
