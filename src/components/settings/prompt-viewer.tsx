"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type PromptData = {
  chat_prompt: string;
  synthesis_prompt: string;
};

type Props = {
  refreshKey?: number;
};

export function PromptViewer({ refreshKey = 0 }: Props) {
  const [data, setData] = useState<PromptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"chat" | "synthesis">("chat");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/debug/prompt", { cache: "no-store" });
        if (!cancelled && res.ok) {
          setData((await res.json()) as PromptData);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return (
    <section className="flex flex-col gap-3 border-t border-border/60 pt-7">
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          System prompt
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Exactly what the agent sees, with your settings inlined.
        </p>
      </div>

      <div className="flex gap-1.5">
        <Button
          type="button"
          size="xs"
          variant={tab === "chat" ? "secondary" : "outline"}
          onClick={() => setTab("chat")}
        >
          Chat
        </Button>
        <Button
          type="button"
          size="xs"
          variant={tab === "synthesis" ? "secondary" : "outline"}
          onClick={() => setTab("synthesis")}
        >
          Synthesis
        </Button>
      </div>
      <pre className="whitespace-pre-wrap break-words rounded border border-border bg-muted/40 p-3 text-[11px] leading-relaxed">
        {loading && !data
          ? "Loading…"
          : data
            ? tab === "chat"
              ? data.chat_prompt
              : data.synthesis_prompt
            : "(failed to load)"}
      </pre>
    </section>
  );
}
