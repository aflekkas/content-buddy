"use client";

import { useEffect, useState, useTransition } from "react";
import { Brain, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ColumnHeader } from "@/components/cockpit/column-header";
import { cn } from "@/lib/utils";
import type { UserMemoryRow } from "@/lib/db/types";

type Props = {
  initialMemories: UserMemoryRow[];
};

export function MemoryRail({ initialMemories }: Props) {
  const [memories, setMemories] = useState(initialMemories);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    async function refresh() {
      const res = await fetch("/api/memory");
      if (!res.ok) return;
      const { memories: rows } = (await res.json()) as {
        memories: UserMemoryRow[];
      };
      setMemories(rows);
    }
    window.addEventListener("memory:saved", refresh);
    return () => window.removeEventListener("memory:saved", refresh);
  }, []);

  async function addMemory(e: React.FormEvent) {
    e.preventDefault();
    const memory = draft.trim();
    if (!memory) return;
    const res = await fetch("/api/memory", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ memory }),
    });
    if (!res.ok) return;
    const { memory: row } = (await res.json()) as { memory: UserMemoryRow };
    setMemories((current) => [row, ...current]);
    setDraft("");
  }

  async function saveEdit(id: string) {
    const memory = editingValue.trim();
    if (!memory) return;
    const res = await fetch(`/api/memory/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ memory }),
    });
    if (!res.ok) return;
    const { memory: row } = (await res.json()) as { memory: UserMemoryRow };
    setMemories((current) => current.map((m) => (m.id === id ? row : m)));
    setEditingId(null);
  }

  async function removeMemory(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/memory/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      setMemories((current) => current.filter((m) => m.id !== id));
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ColumnHeader
        title="Memory"
        icon={Brain}
        description={`${memories.length} ${
          memories.length === 1 ? "memory" : "memories"
        }`}
      />
      <form onSubmit={addMemory} className="flex shrink-0 gap-2 border-b p-3">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="What should the agent remember?"
          maxLength={500}
          className="h-8 text-sm"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!draft.trim()}
          aria-label="Add memory"
        >
          <Plus className="size-4" />
        </Button>
      </form>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {memories.length === 0 ? (
          <p className="px-2 py-4 text-xs text-muted-foreground">
            Nothing remembered yet. Tell the agent your niche, voice, audience,
            or quirks above. It will use these every chat.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {memories.map((memory) => (
              <li
                key={memory.id}
                className={cn(
                  "group flex items-start gap-1.5 rounded-md border bg-background p-2",
                  pending && "opacity-50",
                )}
              >
                {editingId === memory.id ? (
                  <>
                    <Input
                      autoFocus
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void saveEdit(memory.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      maxLength={500}
                      className="h-7 text-sm"
                    />
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => void saveEdit(memory.id)}
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
                      {memory.memory}
                    </p>
                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(memory.id);
                          setEditingValue(memory.memory);
                        }}
                        aria-label="Edit"
                      >
                        <Pencil className="size-3" />
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => void removeMemory(memory.id)}
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
