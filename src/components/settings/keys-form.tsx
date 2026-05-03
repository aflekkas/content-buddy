"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "motion/react";
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
import { CircularLoader } from "@/components/ui/loader";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PROVIDER_IDS,
  PROVIDERS,
  type ProviderId,
} from "@/lib/providers";
import type {
  ActiveModel as Active,
  ExternalCredentialMetaRow,
  ProviderKeyMetaRow,
} from "@/lib/db/types";
import { DUR_FAST, EASE_OUT, useReducedMotionSafe } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Props = {
  initialKeys: ProviderKeyMetaRow[];
  initialActive: Active;
};

export function KeysForm({ initialKeys, initialActive }: Props) {
  const router = useRouter();
  const [keys, setKeys] = useState<Record<string, ProviderKeyMetaRow>>(() => {
    const map: Record<string, ProviderKeyMetaRow> = {};
    for (const k of initialKeys) map[k.provider] = k;
    return map;
  });
  const [active, setActive] = useState<Active>(initialActive);
  const [savingActive, setSavingActive] = useState(false);
  const [integrations, setIntegrations] = useState<
    Record<string, ExternalCredentialMetaRow>
  >({});

  const activeProviderHasKey = Boolean(keys[active.provider]);

  useEffect(() => {
    let cancelled = false;

    async function loadIntegrations() {
      try {
        const res = await fetch("/api/settings/integrations");
        if (!res.ok) throw new Error("load_failed");
        const rows: ExternalCredentialMetaRow[] = await res.json();
        if (cancelled) return;
        setIntegrations(
          Object.fromEntries(rows.map((row) => [row.kind, row])),
        );
      } catch {
        if (!cancelled) toast.error("Could not load integrations");
      }
    }

    void loadIntegrations();

    return () => {
      cancelled = true;
    };
  }, []);

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
      router.refresh();
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
      <div className="divide-y divide-border rounded-xl border bg-background">
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
        <ApifyTokenRow
          meta={integrations.apify ?? null}
          onSaved={(meta) =>
            setIntegrations((prev) => ({ ...prev, apify: meta }))
          }
          onCleared={() =>
            setIntegrations((prev) => {
              const next = { ...prev };
              delete next.apify;
              return next;
            })
          }
        />
        <div className="p-4">
          <p className="mb-3 text-sm font-medium">Active model</p>
          <div className="grid grid-cols-1 gap-2 px-px sm:grid-cols-2">
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
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertCircle className="size-3.5 shrink-0" />
              No key saved for {PROVIDERS[active.provider].label}. Add one below.
            </p>
          )}
        </div>
      </div>
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
  const router = useRouter();
  const reducedMotion = useReducedMotionSafe();
  const info = PROVIDERS[provider];
  const [editing, setEditing] = useState(false);
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
      router.refresh();
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
      setEditing(false);
      form.reset();
      router.refresh();
      toast.success(`${info.label} key removed`);
    } catch {
      toast.error("Could not remove key");
    } finally {
      setRemoving(false);
    }
  }

  function cancelEdit() {
    form.reset();
    setShowPlain(false);
    setEditing(false);
  }

  return (
    <div className="px-4 py-3 first:rounded-t-xl last:rounded-b-xl">
      {/* Static row — always visible */}
      <div className="flex items-center gap-3">
        <ProviderIcon provider={provider} size={18} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{info.label}</p>
          {meta ? (
            <p className="font-mono text-xs text-muted-foreground">
              Connected ····{meta.last4}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Not connected</p>
          )}
        </div>
        <div className="shrink-0">
          {meta ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Manage key"
                    disabled={removing}
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    form.reset();
                    setShowPlain(false);
                    setEditing(true);
                  }}
                >
                  Replace
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => void handleRemove()}
                  disabled={removing}
                >
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                form.reset();
                setShowPlain(false);
                setEditing(true);
              }}
            >
              Add
            </Button>
          )}
        </div>
      </div>

      {/* Inline editor — expands below the row */}
      <AnimatePresence initial={false}>
        {editing && (
          <motion.div
            key="editor"
            initial={reducedMotion ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: DUR_FAST, ease: EASE_OUT }}
            className={cn("overflow-hidden")}
          >
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="mt-3 flex flex-col gap-2"
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
                            className="flex-1 font-mono text-sm"
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
                    {saving ? (
                      <>
                        <CircularLoader size="sm" />
                        Verifying...
                      </>
                    ) : (
                      "Save"
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    onClick={cancelEdit}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <a
                    href={info.consoleUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Get key <ExternalLink className="size-3" />
                  </a>
                </div>
              </form>
            </Form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const apifySchema = z.object({
  token: z.string().trim().min(8, "Token is too short").max(500),
});

function ApifyTokenRow({
  meta,
  onSaved,
  onCleared,
}: {
  meta: ExternalCredentialMetaRow | null;
  onSaved: (m: ExternalCredentialMetaRow) => void;
  onCleared: () => void;
}) {
  const router = useRouter();
  const reducedMotion = useReducedMotionSafe();
  const [editing, setEditing] = useState(false);
  const [showPlain, setShowPlain] = useState(false);
  const [removing, setRemoving] = useState(false);

  type FormValues = z.infer<typeof apifySchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(apifySchema),
    defaultValues: { token: "" },
  });

  const saving = form.formState.isSubmitting;

  async function onSubmit(values: FormValues) {
    try {
      const token = values.token.trim();
      const res = await fetch("/api/settings/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "apify", token }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        if (body?.error === "invalid_key") {
          toast.error(body.message ?? "Apify rejected this token.");
        } else {
          toast.error("Could not save Apify token");
        }
        return;
      }
      onSaved({
        kind: "apify",
        last4: token.slice(-4),
        updated_at: new Date().toISOString(),
      });
      form.reset();
      setEditing(false);
      router.refresh();
      toast.success("Apify token saved");
    } catch {
      toast.error("Could not save Apify token");
    }
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      const res = await fetch("/api/settings/integrations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "apify" }),
      });
      if (!res.ok) throw new Error("delete_failed");
      onCleared();
      setEditing(false);
      form.reset();
      router.refresh();
      toast.success("Apify token removed");
    } catch {
      toast.error("Could not remove Apify token");
    } finally {
      setRemoving(false);
    }
  }

  function cancelEdit() {
    form.reset();
    setShowPlain(false);
    setEditing(false);
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <KeyRound className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            Apify token{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </p>
          {meta ? (
            <p className="font-mono text-xs text-muted-foreground">
              Connected ····{meta.last4}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Optional. Only needed if you opt in to scraping your own LinkedIn.
            </p>
          )}
        </div>
        <div className="shrink-0">
          {meta ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Manage Apify token"
                    disabled={removing}
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    form.reset();
                    setShowPlain(false);
                    setEditing(true);
                  }}
                >
                  Replace
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => void handleRemove()}
                  disabled={removing}
                >
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                form.reset();
                setShowPlain(false);
                setEditing(true);
              }}
            >
              Add
            </Button>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {editing && (
          <motion.div
            key="apify-editor"
            initial={reducedMotion ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: DUR_FAST, ease: EASE_OUT }}
            className={cn("overflow-hidden")}
          >
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="mt-3 flex flex-col gap-2"
              >
                <FormField
                  control={form.control}
                  name="token"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Input
                            {...field}
                            type={showPlain ? "text" : "password"}
                            placeholder="Apify token"
                            className="flex-1 font-mono text-sm"
                            spellCheck={false}
                            autoComplete="off"
                          />
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            type="button"
                            onClick={() => setShowPlain((v) => !v)}
                            aria-label={showPlain ? "Hide token" : "Show token"}
                          >
                            {showPlain ? <EyeOff /> : <Eye />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <p className="text-xs leading-5 text-muted-foreground">
                  Free tier covers most users (~$5/mo credit). From
                  console.apify.com/account/integrations.
                </p>
                <div className="flex items-center gap-2">
                  <Button size="sm" type="submit" disabled={saving}>
                    {saving ? (
                      <>
                        <CircularLoader size="sm" />
                        Verifying...
                      </>
                    ) : (
                      "Save"
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    onClick={cancelEdit}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <a
                    href="https://console.apify.com/account/integrations"
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Get token <ExternalLink className="size-3" />
                  </a>
                </div>
              </form>
            </Form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
