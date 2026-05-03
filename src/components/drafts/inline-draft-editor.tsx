"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Clipboard, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ColumnHeader } from "@/components/cockpit/column-header";
import { useActiveDrafts } from "@/components/cockpit/active-drafts-context";
import { formatRelativeTime } from "@/lib/system-prompt";
import { cn } from "@/lib/utils";
import type { DraftRow } from "@/lib/db/types";

type Props = {
  draftId: string;
};

export function InlineDraftEditor({ draftId }: Props) {
  const { closeDraft, getCached } = useActiveDrafts();
  const [draft, setDraft] = useState<DraftRow | null>(() => getCached(draftId) ?? null);
  const [body, setBody] = useState(draft?.body ?? "");
  const [lastSavedBody, setLastSavedBody] = useState(draft?.body ?? "");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [copied, setCopied] = useState(draft?.status === "copied");
  const [loading, setLoading] = useState(!draft);

  useEffect(() => {
    if (draft) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await fetch(`/api/drafts/${draftId}`);
      if (!res.ok || cancelled) {
        if (!cancelled) setLoading(false);
        return;
      }
      const row = (await res.json()) as DraftRow;
      if (cancelled) return;
      setDraft(row);
      setBody(row.body);
      setLastSavedBody(row.body);
      setCopied(row.status === "copied");
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [draft, draftId]);

  useEffect(() => {
    if (!draft) return;
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
  }, [body, draftId, lastSavedBody, draft]);

  const charCount = useMemo(() => body.length, [body]);

  async function handleCopy() {
    await navigator.clipboard.writeText(body);
    const res = await fetch(`/api/drafts/${draftId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "copied" }),
    });
    if (res.ok) setCopied(true);
  }

  async function handleDismiss() {
    await fetch(`/api/drafts/${draftId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "dismissed" }),
    });
    closeDraft(draftId);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ColumnHeader
        title={draft ? `Draft · ${formatRelativeTime(draft.created_at)}` : "Draft"}
        description={
          saveState === "saving"
            ? "Saving..."
            : saveState === "saved"
              ? "Saved"
              : `${charCount.toLocaleString()} chars`
        }
        right={
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => closeDraft(draftId)}
            aria-label="Close draft tab"
            className="text-muted-foreground"
          >
            <X className="size-3.5" />
          </Button>
        }
      />
      {loading || !draft ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
        </div>
      ) : (
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className="min-h-0 flex-1 resize-none rounded-none border-0 p-3 text-sm leading-6 shadow-none focus-visible:ring-0"
        />
      )}
      <div className="flex shrink-0 items-center justify-between gap-2 border-t bg-muted/30 p-2">
        <span className="text-[10px] text-muted-foreground">
          {charCount.toLocaleString()} chars
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void handleDismiss()}
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            Dismiss
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => void handleCopy()}
            disabled={!body.trim()}
          >
            {copied ? <Check className={cn("size-3.5")} /> : <Clipboard className="size-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>
    </div>
  );
}
