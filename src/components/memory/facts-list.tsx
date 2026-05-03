"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { UserFactRow } from "@/lib/db/types";

type Props = {
  initialFacts: UserFactRow[];
};

export function FactsList({ initialFacts }: Props) {
  const [facts, setFacts] = useState(initialFacts);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [pending, startTransition] = useTransition();

  async function addFact(e: React.FormEvent) {
    e.preventDefault();
    const fact = draft.trim();
    if (!fact) return;
    const res = await fetch("/api/memory", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fact }),
    });
    if (!res.ok) return;
    const { fact: row } = (await res.json()) as { fact: UserFactRow };
    setFacts((current) => [row, ...current]);
    setDraft("");
  }

  async function saveEdit(id: string) {
    const fact = editingValue.trim();
    if (!fact) return;
    const res = await fetch(`/api/memory/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fact }),
    });
    if (!res.ok) return;
    const { fact: row } = (await res.json()) as { fact: UserFactRow };
    setFacts((current) => current.map((f) => (f.id === id ? row : f)));
    setEditingId(null);
  }

  async function removeFact(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/memory/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      setFacts((current) => current.filter((f) => f.id !== id));
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={addFact} className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a fact the agent should remember..."
          maxLength={500}
        />
        <Button type="submit" disabled={!draft.trim()}>
          <Plus className="size-4" /> Add
        </Button>
      </form>

      {facts.length === 0 ? (
        <p className="rounded-2xl border bg-background p-8 text-center text-sm text-muted-foreground">
          No memories yet. Add facts about your niche, voice, audience, or anything
          else the agent should remember every chat.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {facts.map((fact) => (
            <li
              key={fact.id}
              className={cn(
                "group flex items-start gap-2 rounded-md border bg-background p-3",
                pending && "opacity-50",
              )}
            >
              {editingId === fact.id ? (
                <>
                  <Input
                    autoFocus
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void saveEdit(fact.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    maxLength={500}
                  />
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => void saveEdit(fact.id)}
                    aria-label="Save"
                  >
                    <Check className="size-4" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => setEditingId(null)}
                    aria-label="Cancel"
                  >
                    <X className="size-4" />
                  </Button>
                </>
              ) : (
                <>
                  <p className="flex-1 text-sm leading-relaxed">{fact.fact}</p>
                  {fact.source === "agent" && (
                    <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      agent
                    </span>
                  )}
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingId(fact.id);
                      setEditingValue(fact.fact);
                    }}
                    aria-label="Edit"
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => void removeFact(fact.id)}
                    aria-label="Delete"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
