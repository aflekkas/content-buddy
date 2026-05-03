"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ColumnHeader } from "@/components/cockpit/column-header";
import { useActiveDrafts } from "@/components/cockpit/active-drafts-context";
import { formatRelativeTime } from "@/lib/system-prompt";
import { cn } from "@/lib/utils";
import type { DraftRow } from "@/lib/db/types";

type Filter = "all" | "draft" | "copied";

type Props = {
  initialDrafts: DraftRow[];
};

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "copied", label: "Copied" },
];

export function DraftsList({ initialDrafts }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const { activeDraftIds, openDraft } = useActiveDrafts();

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialDrafts
      .filter((d) => d.status !== "dismissed")
      .filter((d) => (filter === "all" ? true : d.status === filter))
      .filter((d) => (q ? d.body.toLowerCase().includes(q) : true));
  }, [initialDrafts, filter, search]);

  function handleClick(draft: DraftRow) {
    openDraft(draft.id);
    if (draft.chat_id) {
      router.push(`/dashboard/chat/${draft.chat_id}`);
    }
  }

  const totalActive = initialDrafts.filter(
    (d) => d.status !== "dismissed",
  ).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ColumnHeader
        title="Drafts"
        icon={FileText}
        iconTone="queue"
        description={`${visible.length} of ${totalActive}`}
      />
      <div className="flex shrink-0 flex-col gap-2 border-b p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter drafts..."
            className="h-8 pl-7 text-sm"
          />
        </div>
        <div className="flex items-center gap-1 text-xs">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-md px-2 py-0.5 transition-colors",
                filter === f.id
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/60",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {visible.length === 0 ? (
          <p className="px-2 py-4 text-xs text-muted-foreground">
            {initialDrafts.length === 0
              ? "No drafts yet. Ask the agent in chat to draft a post and save it."
              : "No matches for that filter."}
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {visible.map((draft) => {
              const active = activeDraftIds.includes(draft.id);
              const preview = draft.body.slice(0, 140);
              return (
                <li key={draft.id}>
                  <button
                    type="button"
                    onClick={() => handleClick(draft)}
                    className={cn(
                      "block w-full rounded-md border bg-background p-2 text-left transition-colors hover:bg-muted/40",
                      active && "border-primary/40 bg-primary/5",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span className="font-medium uppercase tracking-wide">
                        {draft.status}
                      </span>
                      <span>{formatRelativeTime(draft.created_at)}</span>
                    </div>
                    <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-foreground">
                      {preview || <em className="text-muted-foreground">empty</em>}
                      {draft.body.length > preview.length && "..."}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
