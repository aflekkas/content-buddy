"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ColumnHeader } from "@/components/cockpit/column-header";
import { useActiveDrafts } from "@/components/cockpit/active-drafts-context";
import { formatRelativeTime } from "@/lib/system-prompt";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { DraftRow } from "@/lib/db/types";

type Filter = "all" | "draft" | "copied";

type Props = {
  initialDrafts: DraftRow[];
  userId: string;
};

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "copied", label: "Copied" },
];

type StreamingDetail = {
  kind: "save" | "update";
  id?: string;
  body: string;
  toolCallId: string;
};

type StreamingEndDetail = {
  kind: "save" | "update";
  id?: string;
  toolCallId: string;
};

export function DraftsList({ initialDrafts, userId }: Props) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<DraftRow[]>(initialDrafts);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [pendingSaves, setPendingSaves] = useState<
    Map<string, { body: string }>
  >(() => new Map());
  const [liveUpdateBodies, setLiveUpdateBodies] = useState<Map<string, string>>(
    () => new Map(),
  );
  const { activeDraftIds, openDraft } = useActiveDrafts();

  // Realtime subscribe to drafts inserts/updates/deletes for this user.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`drafts-rail:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "drafts",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as DraftRow;
          setDrafts((current) => {
            if (current.some((d) => d.id === row.id)) return current;
            return [row, ...current];
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "drafts",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as DraftRow;
          setDrafts((current) => {
            const exists = current.some((d) => d.id === row.id);
            if (!exists) return [row, ...current];
            return current.map((d) => (d.id === row.id ? row : d));
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "drafts",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.old as Partial<DraftRow>;
          if (!row.id) return;
          setDrafts((current) => current.filter((d) => d.id !== row.id));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  // Same-tab fast-path: refetch on chat tool-finish event (covers eventual consistency gap).
  useEffect(() => {
    async function refresh() {
      try {
        const res = await fetch("/api/drafts", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { drafts?: DraftRow[] } | DraftRow[];
        const rows = Array.isArray(data) ? data : (data.drafts ?? []);
        setDrafts(rows);
      } catch {}
    }
    window.addEventListener("linkedin-studio:drafts:changed", refresh);
    return () =>
      window.removeEventListener("linkedin-studio:drafts:changed", refresh);
  }, []);

  // Live preview while agent's tool args are streaming.
  useEffect(() => {
    function onStreaming(event: Event) {
      const detail = (event as CustomEvent<StreamingDetail>).detail;
      if (!detail) return;
      if (detail.kind === "save") {
        setPendingSaves((current) => {
          const next = new Map(current);
          next.set(detail.toolCallId, { body: detail.body });
          return next;
        });
      } else if (detail.kind === "update" && detail.id) {
        const id = detail.id;
        setLiveUpdateBodies((current) => {
          const next = new Map(current);
          next.set(id, detail.body);
          return next;
        });
        // Auto-open the draft tab so the user can watch the rewrite live.
        openDraft(id);
      }
    }
    function onStreamingEnd(event: Event) {
      const detail = (event as CustomEvent<StreamingEndDetail>).detail;
      if (!detail) return;
      if (detail.kind === "save") {
        setPendingSaves((current) => {
          if (!current.has(detail.toolCallId)) return current;
          const next = new Map(current);
          next.delete(detail.toolCallId);
          return next;
        });
        // Brand-new draft: open it now that we have the persisted id.
        if (detail.id) openDraft(detail.id);
      } else if (detail.kind === "update" && detail.id) {
        const id = detail.id;
        setLiveUpdateBodies((current) => {
          if (!current.has(id)) return current;
          const next = new Map(current);
          next.delete(id);
          return next;
        });
      }
    }
    window.addEventListener("linkedin-studio:draft:streaming", onStreaming);
    window.addEventListener(
      "linkedin-studio:draft:streaming-end",
      onStreamingEnd,
    );
    return () => {
      window.removeEventListener(
        "linkedin-studio:draft:streaming",
        onStreaming,
      );
      window.removeEventListener(
        "linkedin-studio:draft:streaming-end",
        onStreamingEnd,
      );
    };
  }, [openDraft]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return drafts
      .filter((d) => d.status !== "dismissed")
      .filter((d) => (filter === "all" ? true : d.status === filter))
      .filter((d) => (q ? d.body.toLowerCase().includes(q) : true));
  }, [drafts, filter, search]);

  function handleClick(draft: DraftRow) {
    openDraft(draft.id);
    if (draft.chat_id) {
      router.push(`/dashboard/chat/${draft.chat_id}`);
    }
  }

  const totalActive = drafts.filter((d) => d.status !== "dismissed").length;
  const pendingArr = Array.from(pendingSaves.entries());

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
        {pendingArr.length === 0 && visible.length === 0 ? (
          <p className="px-2 py-4 text-xs text-muted-foreground">
            {drafts.length === 0
              ? "No drafts yet. Ask the agent in chat to draft a post — it will land here automatically."
              : "No matches for that filter."}
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {pendingArr.map(([toolCallId, { body }]) => {
              const preview = body.slice(0, 140);
              return (
                <li key={`pending:${toolCallId}`}>
                  <div className="block w-full rounded-md border border-primary/40 bg-primary/5 p-2 text-left">
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1 font-medium uppercase tracking-wide text-primary">
                        <span className="relative flex size-1.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 opacity-75" />
                          <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
                        </span>
                        Writing
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-foreground">
                      {preview ||
                        (
                          <em className="text-muted-foreground">
                            agent is typing…
                          </em>
                        )}
                      {body.length > preview.length && "..."}
                    </p>
                  </div>
                </li>
              );
            })}
            {visible.map((draft) => {
              const active = activeDraftIds.includes(draft.id);
              const live = liveUpdateBodies.get(draft.id);
              const renderBody = live ?? draft.body;
              const preview = renderBody.slice(0, 140);
              const streaming = live !== undefined;
              return (
                <li key={draft.id}>
                  <button
                    type="button"
                    onClick={() => handleClick(draft)}
                    className={cn(
                      "block w-full rounded-md border bg-background p-2 text-left transition-colors hover:bg-muted/40",
                      active && "border-primary/40 bg-primary/5",
                      streaming && "border-primary/40",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span
                        className={cn(
                          "font-medium uppercase tracking-wide",
                          streaming && "text-primary",
                        )}
                      >
                        {streaming ? "Rewriting" : draft.status}
                      </span>
                      <span>{formatRelativeTime(draft.created_at)}</span>
                    </div>
                    <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-foreground">
                      {preview || <em className="text-muted-foreground">empty</em>}
                      {renderBody.length > preview.length && "..."}
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
