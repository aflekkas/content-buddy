"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Clipboard, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [isPending, startTransition] = useTransition();

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
    if (res.ok) startTransition(() => router.push("/dashboard/feed"));
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

      <Textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        className="min-h-0 flex-1 resize-none rounded-none border-0 p-4 text-base leading-7 shadow-none focus-visible:ring-0 md:text-base"
      />

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
          <Button type="button" onClick={() => void handleCopy()}>
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
