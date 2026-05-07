"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, CheckCircle2, Clipboard, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ColumnHeader } from "@/components/cockpit/column-header";
import { useActiveDrafts } from "@/components/cockpit/active-drafts-context";
import { formatRelativeTime } from "@/lib/system-prompt";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { DraftRow } from "@/lib/db/types";

type Props = {
  draftId: string;
};

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

type DraftEvent = { type: "updated"; draft: DraftRow };
type StatusAction = "copy" | "posted" | "dismiss";

function publishDraftUpdate(draft: DraftRow) {
  window.dispatchEvent(
    new CustomEvent<DraftEvent>("linkedin-studio:draft", {
      detail: { type: "updated", draft },
    }),
  );
  window.dispatchEvent(
    new CustomEvent("linkedin-studio:drafts:changed", {
      detail: { id: draft.id },
    }),
  );
}

export function InlineDraftEditor({ draftId }: Props) {
  const { closeDraft, getCached } = useActiveDrafts();
  const [draft, setDraft] = useState<DraftRow | null>(
    () => getCached(draftId) ?? null,
  );
  const [body, setBody] = useState(draft?.body ?? "");
  const [lastSavedBody, setLastSavedBody] = useState(draft?.body ?? "");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [status, setStatus] = useState<DraftRow["status"]>(
    draft?.status ?? "draft",
  );
  const [loading, setLoading] = useState(!draft);
  const [loadFailed, setLoadFailed] = useState(false);
  const [streamingBody, setStreamingBody] = useState<string | null>(null);
  const [conflictBody, setConflictBody] = useState<string | null>(null);
  const [statusAction, setStatusAction] = useState<StatusAction | null>(null);

  useEffect(() => {
    if (draft) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setLoadFailed(false);
      try {
        const res = await fetch(`/api/drafts/${draftId}`);
        if (!res.ok || cancelled) {
          if (!cancelled) {
            setLoadFailed(true);
            setLoading(false);
          }
          return;
        }
        const row = (await res.json()) as DraftRow;
        if (cancelled) return;
        setDraft(row);
        setBody(row.body);
        setLastSavedBody(row.body);
        setStatus(row.status);
        setLoadFailed(false);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setLoadFailed(true);
          setLoading(false);
        }
        return;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [draft, draftId]);

  // Local-edit autosave (debounced).
  useEffect(() => {
    if (!draft) return;
    if (streamingBody !== null) return; // agent is writing — don't push back.
    if (body === lastSavedBody) return;
    const timeout = window.setTimeout(async () => {
      setSaveState("saving");
      const res = await fetch(`/api/drafts/${draftId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        setSaveState("idle");
        return;
      }
      setLastSavedBody(body);
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1200);
    }, 600);
    return () => window.clearTimeout(timeout);
  }, [body, draftId, lastSavedBody, draft, streamingBody]);

  // Supabase realtime: pick up agent's update_draft writes (other tabs / same tab post-stream).
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`draft-editor:${draftId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "drafts",
          filter: `id=eq.${draftId}`,
        },
        (payload) => {
          const row = payload.new as DraftRow;
          // No state to merge if local matches incoming.
          if (row.body === body && row.body === lastSavedBody) {
            setDraft(row);
            setStatus(row.status);
            return;
          }
          const localDirty = body !== lastSavedBody;
          if (localDirty) {
            // User has unsaved edits; surface a conflict banner instead of stomping.
            setConflictBody(row.body);
            setDraft(row);
            setStatus(row.status);
            return;
          }
          setDraft(row);
          setBody(row.body);
          setLastSavedBody(row.body);
          setStatus(row.status);
          setSaveState("saved");
          window.setTimeout(() => setSaveState("idle"), 1200);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [draftId, body, lastSavedBody]);

  // Live "agent is writing" preview from chat tool-arg streaming.
  useEffect(() => {
    function onStreaming(event: Event) {
      const detail = (event as CustomEvent<StreamingDetail>).detail;
      if (!detail) return;
      if (detail.kind !== "update") return;
      if (detail.id !== draftId) return;
      const localDirty = body !== lastSavedBody;
      if (localDirty) {
        setConflictBody(detail.body);
        return;
      }
      setStreamingBody(detail.body);
    }
    function onStreamingEnd(event: Event) {
      const detail = (event as CustomEvent<StreamingEndDetail>).detail;
      if (!detail) return;
      if (detail.kind !== "update") return;
      if (detail.id !== draftId) return;
      setStreamingBody(null);
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
  }, [draftId, body, lastSavedBody]);

  const renderedBody = streamingBody ?? body;
  const charCount = useMemo(() => renderedBody.length, [renderedBody]);
  const isAgentWriting = streamingBody !== null;
  const statusActionPending = statusAction !== null;

  async function updateDraftStatus(
    nextStatus: DraftRow["status"],
    action: StatusAction,
  ): Promise<DraftRow | null> {
    setStatusAction(action);
    try {
      const res = await fetch(`/api/drafts/${draftId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        toast.error("Could not update draft status.");
        return null;
      }
      const row = (await res.json()) as DraftRow;
      setDraft(row);
      setStatus(row.status);
      publishDraftUpdate(row);
      return row;
    } catch {
      toast.error("Could not update draft status.");
      return null;
    } finally {
      setStatusAction(null);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(body);
    } catch {
      toast.error("Could not copy draft.");
      return;
    }
    if (status === "posted") return;
    await updateDraftStatus("copied", "copy");
  }

  async function handlePostedToggle() {
    const nextStatus: DraftRow["status"] =
      status === "posted" ? "copied" : "posted";
    await updateDraftStatus(nextStatus, "posted");
  }

  function acceptConflict() {
    if (conflictBody === null) return;
    setBody(conflictBody);
    setLastSavedBody(conflictBody);
    setConflictBody(null);
    setSaveState("saved");
    window.setTimeout(() => setSaveState("idle"), 1200);
  }

  function dismissConflict() {
    setConflictBody(null);
  }

  const copied = status === "copied" || status === "posted";
  const posted = status === "posted";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ColumnHeader
        title={draft ? `Draft · ${formatRelativeTime(draft.created_at)}` : "Draft"}
        description={
          loadFailed
            ? "Unavailable"
            : isAgentWriting
            ? "Agent writing…"
            : saveState === "saving"
              ? "Saving..."
              : saveState === "saved"
                ? "Saved"
                : `${charCount.toLocaleString()} chars`
        }
        right={
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => closeDraft(draftId)}
            aria-label="Close draft tab"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </Button>
        }
      />
      {conflictBody !== null && (
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-700 dark:text-amber-300">
          <span>Agent rewrote this draft. Discard your edits?</span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={dismissConflict}
              className="h-6 px-2 text-[11px]"
            >
              Keep mine
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={acceptConflict}
              className="h-6 px-2 text-[11px]"
            >
              Use agent&apos;s
            </Button>
          </div>
        </div>
      )}
      {loading ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
        </div>
      ) : !draft ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">Draft unavailable</p>
            <p className="mt-1 text-xs">
              This draft may have been dismissed, deleted, or failed to load.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => closeDraft(draftId)}
          >
            Close
          </Button>
        </div>
      ) : (
        <>
          <Textarea
            value={renderedBody}
            onChange={(event) => {
              if (isAgentWriting) return;
              setBody(event.target.value);
            }}
            readOnly={isAgentWriting}
            className={cn(
              "min-h-0 flex-1 resize-none rounded-none border-0 p-3 text-sm leading-6 shadow-none focus-visible:ring-0",
              isAgentWriting && "opacity-80",
            )}
          />
          <div className="flex shrink-0 items-center justify-between gap-2 border-t bg-muted/30 p-2">
            <span className="text-[10px] text-muted-foreground">
              {charCount.toLocaleString()} chars
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                onClick={() => void handleCopy()}
                disabled={!body.trim() || isAgentWriting || statusActionPending}
              >
                {statusAction === "copy" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : copied ? (
                  <Check className={cn("size-3.5")} />
                ) : (
                  <Clipboard className="size-3.5" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button
                type="button"
                variant={posted ? "secondary" : "ghost"}
                size="sm"
                onClick={() => void handlePostedToggle()}
                disabled={!body.trim() || isAgentWriting || statusActionPending}
                className={cn(
                  !posted && "text-muted-foreground",
                  posted && "text-foreground",
                )}
              >
                {statusAction === "posted" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-3.5" />
                )}
                Posted
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
