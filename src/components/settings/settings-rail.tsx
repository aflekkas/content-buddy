"use client";

import { Settings as SettingsIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ColumnHeader } from "@/components/cockpit/column-header";
import { Input } from "@/components/ui/input";
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

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="flex flex-col gap-5 text-sm">
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
              <div className="flex items-center gap-2">
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
                <div className="flex gap-1">
                  {LENGTH_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => patch("length_pref", preset)}
                      className={cn(
                        "rounded border px-2 py-0.5 text-xs",
                        settings.length_pref === preset
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </Field>
          </Section>

          <Section
            title="Preferred post types"
            hint="None = let the writer choose per source."
          >
            <div className="flex flex-wrap gap-1.5">
              {POST_TYPES.map((type) => {
                const active = settings.preferred_post_types.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => togglePostType(type)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs transition-colors",
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {POST_TYPE_LABELS[type]}
                  </button>
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
            <Field label="Include source links when relevant">
              <button
                type="button"
                onClick={() => patch("include_links", !settings.include_links)}
                className={cn(
                  "inline-flex h-6 w-11 items-center rounded-full border transition-colors",
                  settings.include_links
                    ? "border-foreground bg-foreground"
                    : "border-border bg-muted",
                )}
                aria-pressed={settings.include_links}
                aria-label="Toggle include links"
              >
                <span
                  className={cn(
                    "inline-block size-4 rounded-full bg-background transition-transform",
                    settings.include_links ? "translate-x-6" : "translate-x-1",
                  )}
                />
              </button>
            </Field>
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
    <section className="flex flex-col gap-2.5">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
        {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
      </div>
      <div className="flex flex-col gap-3">{children}</div>
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
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-foreground">{label}</label>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
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
    <div className="inline-flex rounded-md border border-border p-0.5">
      {values.map((v, idx) => {
        const active = current === v;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            title={labels[idx]}
            className={cn(
              "min-w-7 rounded px-2 py-1 text-xs transition-colors",
              active
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted",
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
