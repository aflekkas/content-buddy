"use client";

import { Settings as SettingsIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ColumnHeader } from "@/components/cockpit/column-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { POST_TYPES, type PostType, type UserProfileRow } from "@/lib/db/types";
import { cn } from "@/lib/utils";

type Props = {
  initialProfile: UserProfileRow | null;
};

type Settings = {
  target_audience: string;
  post_goal: string;
  formality: number;
  elaboration: number;
  length_pref: number;
  preferred_post_types: PostType[];
  avoid_phrases: string;
  include_links: boolean;
};

const DEFAULTS: Settings = {
  target_audience: "",
  post_goal: "",
  formality: 3,
  elaboration: 2,
  length_pref: 1500,
  preferred_post_types: [],
  avoid_phrases: "",
  include_links: false,
};

const FORMALITY_LABELS = [
  "ultra-casual",
  "casual",
  "neutral",
  "polished",
  "formal-exec",
];
const ELABORATION_LABELS = ["tight", "balanced", "expansive"];
const LENGTH_PRESETS = [800, 1500, 2500];
const POST_TYPE_LABELS: Record<PostType, string> = {
  hot_take: "Hot take",
  story: "Story",
  framework: "Framework",
  teardown: "Teardown",
  listicle: "Listicle",
  contrarian: "Contrarian",
  question: "Question",
  lesson: "Lesson",
};

function fromProfile(p: UserProfileRow | null): Settings {
  if (!p) return DEFAULTS;
  return {
    target_audience: p.target_audience ?? "",
    post_goal: p.post_goal ?? "",
    formality: p.formality ?? 3,
    elaboration: p.elaboration ?? 2,
    length_pref: p.length_pref ?? 1500,
    preferred_post_types: p.preferred_post_types ?? [],
    avoid_phrases: p.avoid_phrases ?? "",
    include_links: p.include_links ?? false,
  };
}

export function SettingsRail({ initialProfile }: Props) {
  const [settings, setSettings] = useState<Settings>(() =>
    fromProfile(initialProfile),
  );
  const [savingState, setSavingState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  function patch<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((current) => {
      const next = { ...current, [key]: value };
      schedulePatch(next, key);
      return next;
    });
  }

  function schedulePatch(next: Settings, key: keyof Settings) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSavingState("saving");
      const payload = serializeForPatch(next, key);
      try {
        const res = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("save_failed");
        setSavingState("saved");
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => setSavingState("idle"), 1200);
      } catch {
        setSavingState("idle");
      }
    }, 500);
  }

  function togglePostType(type: PostType) {
    setSettings((current) => {
      const exists = current.preferred_post_types.includes(type);
      const nextList = exists
        ? current.preferred_post_types.filter((t) => t !== type)
        : [...current.preferred_post_types, type];
      const next = { ...current, preferred_post_types: nextList };
      schedulePatch(next, "preferred_post_types");
      return next;
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ColumnHeader
        title="Settings"
        icon={SettingsIcon}
        description={
          savingState === "saving"
            ? "Saving…"
            : savingState === "saved"
              ? "Saved"
              : "Soft hints for the writer"
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <div className="flex flex-col text-sm">
          <Section title="Audience" hint="Free-form. Soft hints, not callouts.">
            <Field label="Target audience">
              <Textarea
                value={settings.target_audience}
                onChange={(e) => patch("target_audience", e.target.value)}
                placeholder="e.g. B2B SaaS founders, 10-50 employees, post-PMF"
                maxLength={500}
                rows={2}
                className="text-sm"
              />
            </Field>
            <Field label="Post goal">
              <Textarea
                value={settings.post_goal}
                onChange={(e) => patch("post_goal", e.target.value)}
                placeholder="e.g. build authority on AI agents, drive inbound DMs"
                maxLength={500}
                rows={2}
                className="text-sm"
              />
            </Field>
          </Section>

          <Section title="Style">
            <Field label={`Formality · ${FORMALITY_LABELS[settings.formality - 1]}`}>
              <Segmented
                values={[1, 2, 3, 4, 5]}
                current={settings.formality}
                labels={FORMALITY_LABELS}
                onChange={(v) => patch("formality", v)}
              />
            </Field>
            <Field
              label={`Elaboration · ${ELABORATION_LABELS[settings.elaboration - 1]}`}
            >
              <Segmented
                values={[1, 2, 3]}
                current={settings.elaboration}
                labels={ELABORATION_LABELS}
                onChange={(v) => patch("elaboration", v)}
              />
            </Field>
            <Field label="Target length (chars)">
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  type="number"
                  min={200}
                  max={5000}
                  value={settings.length_pref}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isFinite(n)) patch("length_pref", n);
                  }}
                  className="h-8 w-24 text-sm"
                />
                <div className="flex flex-wrap gap-1.5">
                  {LENGTH_PRESETS.map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      size="xs"
                      variant={
                        settings.length_pref === preset ? "secondary" : "outline"
                      }
                      onClick={() => patch("length_pref", preset)}
                    >
                      {preset}
                    </Button>
                  ))}
                </div>
              </div>
            </Field>
          </Section>

          <Section
            title="Preferred post types"
            hint="None = let the writer choose per source."
          >
            <div className="flex flex-wrap gap-2">
              {POST_TYPES.map((type) => {
                const active = settings.preferred_post_types.includes(type);
                return (
                  <Button
                    key={type}
                    type="button"
                    size="xs"
                    shape="pill"
                    variant={active ? "secondary" : "outline"}
                    onClick={() => togglePostType(type)}
                  >
                    {POST_TYPE_LABELS[type]}
                  </Button>
                );
              })}
            </div>
          </Section>

          <Section title="Constraints">
            <Field
              label="Avoid phrases"
              hint="One per line. Words/phrases the writer must not use."
            >
              <Textarea
                value={settings.avoid_phrases}
                onChange={(e) => patch("avoid_phrases", e.target.value)}
                placeholder={"leverage\nsynergy\nrocket emoji"}
                maxLength={1000}
                rows={3}
                className="text-sm"
              />
            </Field>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="include-links-toggle" className="text-xs font-medium">
                Include source links when relevant
              </Label>
              <button
                id="include-links-toggle"
                type="button"
                onClick={() => patch("include_links", !settings.include_links)}
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  settings.include_links ? "bg-primary" : "bg-input",
                )}
                role="switch"
                aria-checked={settings.include_links}
                aria-label="Toggle include links"
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block size-4 rounded-full bg-background shadow-sm ring-0 transition-transform",
                    settings.include_links ? "translate-x-[18px]" : "translate-x-0.5",
                  )}
                />
              </button>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 border-t border-border/60 pt-7 first:border-t-0 first:pt-0">
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {title}
        </h3>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs font-medium text-foreground">{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}

function Segmented({
  values,
  current,
  labels,
  onChange,
}: {
  values: number[];
  current: number;
  labels: string[];
  onChange: (value: number) => void;
}) {
  return (
    <div className="inline-flex w-fit rounded-md bg-muted p-1">
      {values.map((v, idx) => {
        const active = current === v;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            title={labels[idx]}
            className={cn(
              "rounded-sm px-3 py-1 text-xs font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {v}
          </button>
        );
      })}
    </div>
  );
}

function serializeForPatch(s: Settings, key: keyof Settings) {
  switch (key) {
    case "target_audience":
      return { target_audience: s.target_audience.trim() || null };
    case "post_goal":
      return { post_goal: s.post_goal.trim() || null };
    case "avoid_phrases":
      return { avoid_phrases: s.avoid_phrases.trim() || null };
    case "formality":
      return { formality: s.formality };
    case "elaboration":
      return { elaboration: s.elaboration };
    case "length_pref":
      return { length_pref: s.length_pref };
    case "preferred_post_types":
      return { preferred_post_types: s.preferred_post_types };
    case "include_links":
      return { include_links: s.include_links };
  }
}
