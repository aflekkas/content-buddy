"use client";

import { useState, useTransition } from "react";
import { Brain, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ColumnHeader } from "@/components/cockpit/column-header";
import { cn } from "@/lib/utils";
import type { UserFactRow } from "@/lib/db/types";

type Props = {
  initialFacts: UserFactRow[];
};

export function MemoryRail({ initialFacts }: Props) {
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
    <div className="flex min-h-0 flex-1 flex-col">
      <ColumnHeader
        title="Memory"
        icon={Brain}
        description={`${facts.length} fact${facts.length === 1 ? "" : "s"}`}
      />
      <form onSubmit={addFact} className="flex shrink-0 gap-2 border-b p-3">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="What should the agent remember?"
          maxLength={500}
          className="h-8 text-sm"
        />
        <Button
          type="submit"
          size="icon-sm"
          disabled={!draft.trim()}
          aria-label="Add fact"
        >
          <Plus className="size-4" />
        </Button>
      </form>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {facts.length === 0 ? (
          <p className="px-2 py-4 text-xs text-muted-foreground">
            No facts yet. Tell the agent your niche, voice, or audience above.
            It will use these every chat.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {facts.map((fact) => (
              <li
                key={fact.id}
                className={cn(
                  "group flex items-start gap-1.5 rounded-md border bg-background p-2",
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
                      className="h-7 text-sm"
                    />
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => void saveEdit(fact.id)}
                      aria-label="Save"
                    >
                      <Check className="size-3.5" />
                    </Button>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                      aria-label="Cancel"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="min-w-0 flex-1 break-words text-xs leading-relaxed">
                      {fact.fact}
                    </p>
                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      {fact.source === "agent" && (
                        <span className="rounded-full border px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
                          AI
                        </span>
                      )}
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(fact.id);
                          setEditingValue(fact.fact);
                        }}
                        aria-label="Edit"
                      >
                        <Pencil className="size-3" />
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => void removeFact(fact.id)}
                        aria-label="Delete"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
