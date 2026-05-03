"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Newspaper, Shuffle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Mode = "news" | "life" | "mix";

const MODES: Array<{
  mode: Mode;
  label: string;
  Icon: typeof Newspaper;
}> = [
  { mode: "news", label: "Scan news", Icon: Newspaper },
  { mode: "life", label: "New life post", Icon: Sparkles },
  { mode: "mix", label: "Mix", Icon: Shuffle },
];

export function ScanControls() {
  const router = useRouter();
  const [busy, setBusy] = useState<Mode | null>(null);
  const [, startTransition] = useTransition();

  async function run(mode: Mode) {
    if (busy) return;
    setBusy(mode);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(payload?.message ?? payload?.error ?? "Could not draft.");
        return;
      }
      const draftId = payload?.id;
      toast.success("Draft ready.");
      if (draftId) {
        startTransition(() => router.push(`/dashboard/drafts/${draftId}`));
      } else {
        startTransition(() => router.refresh());
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {MODES.map(({ mode, label, Icon }) => (
        <Button
          key={mode}
          type="button"
          size="sm"
          variant={mode === "news" ? "default" : "outline"}
          onClick={() => run(mode)}
          disabled={busy !== null}
        >
          <Icon className="size-3.5" />
          {busy === mode ? "Drafting" : label}
        </Button>
      ))}
    </div>
  );
}
