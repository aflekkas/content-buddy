"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { MemoryFileRow, UserFactRow } from "@/lib/db/types";

type Props = {
  initialFacts: UserFactRow[];
  initialMemoryFiles: MemoryFileRow[];
};

export function MemorySection({ initialFacts, initialMemoryFiles }: Props) {
  const router = useRouter();
  const [facts, setFacts] = useState(initialFacts);
  const [pending, setPending] = useState<string | null>(null);

  async function deleteFact(id: string) {
    setPending(id);
    try {
      const res = await fetch(`/api/facts/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("delete_failed");
      setFacts((prev) => prev.filter((f) => f.id !== id));
      router.refresh();
    } catch {
      toast.error("Could not delete fact");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <section>
        <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Remembered facts ({facts.length})
        </p>
        {facts.length === 0 ? (
          <div className="rounded-xl border bg-background p-4 text-sm text-muted-foreground">
            Nothing saved yet. The bot will remember details as you chat.
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-xl border bg-background">
            {facts.map((fact) => (
              <li
                key={fact.id}
                className="flex items-start gap-3 px-4 py-3 first:rounded-t-xl last:rounded-b-xl"
              >
                <p className="min-w-0 flex-1 text-sm">{fact.content}</p>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => void deleteFact(fact.id)}
                  disabled={pending === fact.id}
                  aria-label="Delete fact"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Knowledge files ({initialMemoryFiles.length})
        </p>
        {initialMemoryFiles.length === 0 ? (
          <div className="rounded-xl border bg-background p-4 text-sm text-muted-foreground">
            No knowledge files yet.
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-xl border bg-background">
            {initialMemoryFiles.map((file) => (
              <li
                key={file.id}
                className="flex items-start gap-3 px-4 py-3 first:rounded-t-xl last:rounded-b-xl"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{file.title}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {file.path}
                  </p>
                </div>
                {file.autoload && (
                  <span className="rounded-md border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    Autoload
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Knowledge files are managed by the bot as you chat. Facts above are
          short snippets it pinned about you.
        </p>
      </section>
    </div>
  );
}
