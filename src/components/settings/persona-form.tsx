"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type Props = {
  initialName: string | null;
  initialPersona: string | null;
};

const NAME_MAX = 60;
const PERSONA_MAX = 1000;

const PERSONA_PRESETS: { label: string; text: string }[] = [
  {
    label: "Hype coach",
    text:
      "Energetic, optimistic, and direct. Cheer the creator on, push them to publish, and never let an idea sit too long.",
  },
  {
    label: "Dry strategist",
    text:
      "Calm, terse, slightly sarcastic. Cut the fluff, name the tradeoff, and only get excited when the data warrants it.",
  },
  {
    label: "Patient mentor",
    text:
      "Warm, methodical, asks questions before prescribing. Treat every idea like it matters and break things down step by step.",
  },
];

export function PersonaForm({ initialName, initialPersona }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName ?? "");
  const [persona, setPersona] = useState(initialPersona ?? "");
  const [saving, setSaving] = useState(false);

  const baseline = (initialName ?? "") + "|" + (initialPersona ?? "");
  const current = name.trim() + "|" + persona.trim();
  const dirty = baseline !== current;

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
      toast.success("Persona updated");
      router.refresh();
    } catch {
      toast.error("Could not save persona");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="bot-name">Bot name</Label>
        <Input
          id="bot-name"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
          placeholder="e.g. Sage, Spark, Marie"
          autoComplete="off"
        />
        <p className="text-xs text-muted-foreground">
          What should the assistant call itself? Leave blank to keep the default.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="bot-persona">Personality</Label>
        <Textarea
          id="bot-persona"
          value={persona}
          onChange={(e) => setPersona(e.target.value.slice(0, PERSONA_MAX))}
          placeholder="Describe the tone and style. Direct? Encouraging? Sarcastic? Concise?"
          rows={5}
        />
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {PERSONA_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setPersona(preset.text)}
                className="rounded-md border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {preset.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {persona.length}/{PERSONA_MAX}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={() => void onSave()} disabled={saving || !dirty} size="sm">
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
