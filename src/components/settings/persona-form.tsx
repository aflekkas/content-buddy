"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  initialName: string | null;
  initialPersona: string | null;
};

const NAME_MAX = 60;
const PERSONA_MAX = 1000;

const PERSONA_PRESETS: { label: string; emoji: string; text: string }[] = [
  {
    label: "Hype coach",
    emoji: "🔥",
    text:
      "Energetic, optimistic, and direct. Cheer the creator on, push them to publish, and never let an idea sit too long.",
  },
  {
    label: "Dry strategist",
    emoji: "🎯",
    text:
      "Calm, terse, slightly sarcastic. Cut the fluff, name the tradeoff, and only get excited when the data warrants it.",
  },
  {
    label: "Patient mentor",
    emoji: "🪴",
    text:
      "Warm, methodical, asks questions before prescribing. Treat every idea like it matters and break things down step by step.",
  },
];

export function PersonaForm({ initialName, initialPersona }: Props) {
  const [savedName, setSavedName] = useState(initialName ?? "");
  const [savedPersona, setSavedPersona] = useState(initialPersona ?? "");
  const [name, setName] = useState(initialName ?? "");
  const [persona, setPersona] = useState(initialPersona ?? "");
  const [saving, setSaving] = useState(false);

  const dirty = name.trim() !== savedName.trim() || persona.trim() !== savedPersona.trim();

  async function onSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/persona", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assistant_name: name.trim() || null,
          assistant_persona: persona.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("save_failed");
      setSavedName(name.trim());
      setSavedPersona(persona.trim());
      toast.success("Persona updated");
    } catch {
      toast.error("Could not save persona");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <Label htmlFor="bot-name" className="text-sm font-medium">
          Bot name
        </Label>
        <Input
          id="bot-name"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
          placeholder="e.g. Sage, Spark, Marie"
          autoComplete="off"
          className="h-10 text-base md:text-base"
        />
        <p className="text-xs text-muted-foreground">
          What the assistant calls itself. Blank keeps the default.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="bot-persona" className="text-sm font-medium">
            Personality
          </Label>
          <span className="text-xs text-muted-foreground">
            {persona.length}/{PERSONA_MAX}
          </span>
        </div>
        <Textarea
          id="bot-persona"
          value={persona}
          onChange={(e) => setPersona(e.target.value.slice(0, PERSONA_MAX))}
          placeholder="Describe tone and style. Direct? Encouraging? Sarcastic? Concise?"
          rows={5}
          className="min-h-32 leading-relaxed"
        />
        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-muted-foreground">Quick presets</p>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
            {PERSONA_PRESETS.map((preset) => {
              const active = persona.trim() === preset.text;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setPersona(preset.text)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    active
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-foreground/30 hover:bg-muted/40",
                  )}
                >
                  <span className="text-base">{preset.emoji}</span>
                  <span className="font-medium">{preset.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="flex items-center justify-end gap-3 border-t pt-4">
        {dirty && !saving && (
          <span className="text-xs text-muted-foreground">Unsaved changes</span>
        )}
        <Button onClick={() => void onSave()} disabled={saving || !dirty}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
