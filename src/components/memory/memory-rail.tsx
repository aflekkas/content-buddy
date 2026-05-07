"use client";

import { useEffect, useState, useTransition } from "react";
import { Brain, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColumnHeader } from "@/components/cockpit/column-header";
import { MotionList, MotionListItem } from "@/components/ui/motion";
import { cn } from "@/lib/utils";
import type { UserMemoryRow } from "@/lib/db/types";

type Props = {
  initialMemories: UserMemoryRow[];
};

export function MemoryRail({ initialMemories }: Props) {
  const [memories, setMemories] = useState(initialMemories);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

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

  function removeMemory(id: string) {
    const previous = memories;
    setMemories((current) => current.filter((m) => m.id !== id));
    setPendingId(id);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/memory/${id}`, { method: "DELETE" });
        if (!res.ok) setMemories(previous);
      } catch {
        setMemories(previous);
      } finally {
        setPendingId(null);
      }
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
      <div className="shrink-0 border-b p-3">
        <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          <Sparkles className="mt-0.5 size-3.5 shrink-0" />
          <p className="leading-relaxed">
            Memories are built by the agent. Mention things worth remembering
            in chat and they will appear here. Delete any you don&apos;t want.
          </p>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {memories.length === 0 ? (
          <p className="px-2 py-4 text-xs text-muted-foreground">
            Nothing remembered yet. Chat with the agent and it will save things
            worth remembering here.
          </p>
        ) : (
          <MotionList className="flex flex-col gap-1.5">
            {memories.map((memory) => (
              <MotionListItem
                key={memory.id}
                className={cn(
                  "group flex items-start gap-1.5 rounded-md border bg-background p-2",
                  pendingId === memory.id && "opacity-50",
                )}
              >
                <p className="min-w-0 flex-1 break-words text-xs leading-relaxed">
                  {memory.memory}
                </p>
                <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100">
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => removeMemory(memory.id)}
                    aria-label="Delete"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </MotionListItem>
            ))}
          </MotionList>
        )}
      </div>
    </div>
  );
}
