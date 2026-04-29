"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ExternalLink, Eye, EyeOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { SelectField } from "@/components/ui/select-field";
import { ProviderIcon } from "@/components/ui/provider-icon";
import {
  PROVIDER_IDS,
  PROVIDERS,
  type ProviderId,
} from "@/lib/providers";
import type { ProviderKeyMetaRow } from "@/lib/db/types";

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
    <div className="flex flex-col gap-5">
      {/* Active model */}
      <section className="flex flex-col gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Active model
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Changes save immediately.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <SelectField
            id="active-provider"
            label="Provider"
            value={active.provider}
            onValueChange={(v) => onProviderChange(v as ProviderId)}
            disabled={savingActive}
            options={PROVIDER_IDS.map((p) => ({
              value: p,
              label: PROVIDERS[p].label,
              icon: <ProviderIcon provider={p} size={14} />,
            }))}
          />

          <SelectField
            id="active-model"
            label="Model"
            value={active.model}
            onValueChange={onModelChange}
            disabled={savingActive}
            options={PROVIDERS[active.provider].models.map((m) => ({
              value: m.id,
              label: m.label,
            }))}
          />
        </div>

        {!activeProviderHasKey && (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            No key saved for {PROVIDERS[active.provider].label}. Add one below
            or chats will fail until you do.
          </p>
        )}
      </section>

      <hr className="border-border" />

      {/* API keys */}
      <section className="flex flex-col gap-0">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          API keys
        </p>
        {PROVIDER_IDS.map((p) => (
          <ProviderKeyRow
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

function buildKeySchema(prefix: string) {
  return z.object({
    key: z
      .string()
      .trim()
      .min(1, "Required")
      .startsWith(prefix, `Key should start with ${prefix}`),
  });
}

function ProviderKeyRow({
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
  const [showPlain, setShowPlain] = useState(false);
  const [removing, setRemoving] = useState(false);

  const schema = buildKeySchema(info.keyPrefix);
  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { key: "" },
  });

  const saving = form.formState.isSubmitting;

  async function onSubmit(values: FormValues) {
    try {
      const res = await fetch("/api/settings/keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, key: values.key }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        if (body?.error === "invalid_key") {
          toast.error(
            body.message ?? "Provider rejected this key. Check it and try again.",
          );
        } else if (body?.error === "wrong_prefix") {
          toast.error(`Key should start with ${body.expected}`);
        } else {
          toast.error("Could not save key");
        }
        return;
      }
      const next: ProviderKeyMetaRow = await res.json();
      onSaved(next);
      form.reset();
      setEditing(false);
      toast.success(`${info.label} key saved`);
    } catch {
      toast.error("Could not save key");
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
    <div className="border-b border-border py-2.5 last:border-b-0">
      {meta && !editing ? (
        /* Saved state: single row */
        <div className="flex items-center gap-3">
          <ProviderIcon provider={provider} size={18} className="shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
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
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="font-mono text-xs text-muted-foreground">
              ...{meta.last4}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400">
              Saved
            </span>
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
      ) : (
        /* Editing state: label row + input row */
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <ProviderIcon provider={provider} size={18} className="shrink-0" />
            <span className="text-sm font-medium">{info.label}</span>
            <a
              href={info.consoleUrl}
              target="_blank"
              rel="noreferrer"
              className="ml-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Get key <ExternalLink className="size-3" />
            </a>
          </div>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-1.5"
            >
              <FormField
                control={form.control}
                name="key"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Input
                          {...field}
                          type={showPlain ? "text" : "password"}
                          placeholder={`${info.keyPrefix}...`}
                          className="flex-1 bg-background font-mono text-sm"
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
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <div className="flex items-center gap-2">
                <Button size="sm" type="submit" disabled={saving}>
                  {saving ? "Verifying..." : "Save"}
                </Button>
                {meta && (
                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    onClick={() => {
                      form.reset();
                      setEditing(false);
                    }}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </div>
      )}
    </div>
  );
}
