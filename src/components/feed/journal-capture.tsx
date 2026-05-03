"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const MAX_LEN = 8000;

export function JournalCapture() {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function submit() {
    const trimmed = body.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        throw new Error(detail?.error ?? "save_failed");
      }
      setBody("");
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "save_failed");
    } finally {
      setSubmitting(false);
    }
  }

  const remaining = MAX_LEN - body.length;
  const overLimit = remaining < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <Card className="rounded-2xl border bg-background p-4 shadow-sm">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Pencil className="size-3.5" />
          Drop a journal note. Use it later for life posts.
        </div>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={3}
          placeholder="What happened today? Ship a thing, lose a deal, learn something."
          className={cn(
            "mt-2 w-full resize-none rounded-xl border bg-background px-3 py-2 text-sm leading-6 outline-none transition placeholder:text-muted-foreground focus:border-primary",
            overLimit && "border-destructive",
          )}
        />
        <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span className={cn(overLimit && "text-destructive")}>
            {body.length}/{MAX_LEN}
          </span>
          <div className="flex items-center gap-2">
            {error ? (
              <span className="text-destructive">{error}</span>
            ) : null}
            <Button
              type="button"
              size="sm"
              onClick={submit}
              disabled={!body.trim() || submitting || overLimit}
            >
              {submitting ? "Saving" : "Save note"}
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
