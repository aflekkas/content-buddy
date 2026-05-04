"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type PromptData = {
  chat_prompt: string;
  synthesis_prompt: string;
};

export function PromptViewer() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<PromptData | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"chat" | "synthesis">("chat");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/debug/prompt");
      if (res.ok) setData((await res.json()) as PromptData);
    } finally {
      setLoading(false);
    }
  }

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !data) await load();
  }

  return (
    <section className="flex flex-col gap-2 border-t border-border/60 pt-7">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            System prompt
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Exactly what the agent sees, with your settings inlined.
          </p>
        </div>
        <Button
          type="button"
          size="xs"
          variant="outline"
          onClick={() => void toggle()}
        >
          {open ? "Hide" : "View"}
        </Button>
      </div>

      {open ? (
        <div className="flex flex-col gap-2">
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
            {data && !loading ? (
              <Button
                type="button"
                size="xs"
                variant="ghost"
                className="ml-auto"
                onClick={() => void load()}
              >
                Refresh
              </Button>
            ) : null}
          </div>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded border border-border bg-muted/40 p-3 text-[11px] leading-relaxed">
            {loading
              ? "Loading…"
              : data
                ? tab === "chat"
                  ? data.chat_prompt
                  : data.synthesis_prompt
                : "(failed to load)"}
          </pre>
        </div>
      ) : null}
    </section>
  );
}
