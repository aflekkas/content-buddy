"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Clipboard, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CircularLoader } from "@/components/ui/loader";
import { Textarea } from "@/components/ui/textarea";
import { formatRelativeTime } from "@/lib/system-prompt";
import { cn } from "@/lib/utils";

type Draft = {
  id: string;
  body: string;
  status: "draft" | "copied" | "dismissed";
  created_at: string;
};

type Props = {
  draft: Draft;
  sourceHandles: string[];
};

export function DraftEditor({ draft, sourceHandles }: Props) {
  const router = useRouter();
  const [body, setBody] = useState(draft.body);
  const [lastSavedBody, setLastSavedBody] = useState(draft.body);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [copied, setCopied] = useState(draft.status === "copied");
  const [synthesisSlow, setSynthesisSlow] = useState(false);
  const [isPending, startTransition] = useTransition();
  const hasBody = body.trim().length > 0;

  useEffect(() => {
    if (body === lastSavedBody) return;
    const timeout = window.setTimeout(async () => {
      setSaveState("saving");
      const res = await fetch(`/api/drafts/${draft.id}`, {
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
  }, [body, draft.id, lastSavedBody]);

  useEffect(() => {
    if (hasBody) {
      const timeout = window.setTimeout(() => setSynthesisSlow(false), 0);
      return () => window.clearTimeout(timeout);
    }

    const timeout = window.setTimeout(() => setSynthesisSlow(true), 30_000);
    return () => window.clearTimeout(timeout);
  }, [hasBody]);

  const charCount = useMemo(() => body.length, [body]);

  async function handleCopy() {
    await navigator.clipboard.writeText(body);
    const res = await fetch(`/api/drafts/${draft.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "copied" }),
    });
    if (res.ok) setCopied(true);
  }

  async function handleDismiss() {
    const res = await fetch(`/api/drafts/${draft.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "dismissed" }),
    });
    if (res.ok) startTransition(() => router.push("/dashboard/drafts"));
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-2xl border bg-background shadow-sm">
      <div className="shrink-0 border-b p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-sm font-semibold">
              Draft · {formatRelativeTime(draft.created_at)}
            </h1>
            {sourceHandles.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {sourceHandles.map((handle) => (
                  <span
                    key={handle}
                    className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    {normalizeHandle(handle)}
                  </span>
                ))}
              </div>
            )}
          </div>
          <span
            className={cn(
              "text-xs text-muted-foreground",
              saveState === "saving" && "text-foreground",
            )}
          >
            {saveState === "saving"
              ? "Saving"
              : saveState === "saved"
                ? "Saved"
                : `${charCount.toLocaleString()} chars`}
          </span>
        </div>
      </div>

      {hasBody ? (
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className="min-h-0 flex-1 resize-none rounded-none border-0 p-4 text-base leading-7 shadow-none focus-visible:ring-0 md:text-base"
        />
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          <div className="flex max-w-sm flex-col items-center gap-3 text-center">
            <CircularLoader size="sm" />
            <p className="text-sm font-medium">Synthesizing...</p>
            {synthesisSlow ? (
              <p className="text-sm leading-6 text-muted-foreground">
                Synthesis taking longer than expected. Refresh to retry.
              </p>
            ) : null}
          </div>
        </div>
      )}

      <div className="flex shrink-0 items-center justify-between gap-3 border-t p-4">
        <span className="text-xs text-muted-foreground">
          {charCount.toLocaleString()} characters
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => void handleDismiss()}
            disabled={isPending}
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="size-3.5" />
            Dismiss
          </Button>
          <Button type="button" onClick={() => void handleCopy()} disabled={!hasBody}>
            {copied ? (
              <Check className="size-3.5" />
            ) : (
              <Clipboard className="size-3.5" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>
    </section>
  );
}

function normalizeHandle(handle: string) {
  return handle.startsWith("@") ? handle : `@${handle}`;
}
