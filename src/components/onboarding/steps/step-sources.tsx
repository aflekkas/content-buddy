"use client";

import type { Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import type { OnboardingState } from "@/components/onboarding/onboarding-flow";
import { Button } from "@/components/ui/button";
import { CircularLoader } from "@/components/ui/loader";
import { Textarea } from "@/components/ui/textarea";
import { NICHE_BUNDLES } from "@/lib/sources/niche-bundles";

type Props = {
  state: OnboardingState;
  setState: Dispatch<SetStateAction<OnboardingState>>;
  onFinish: () => void;
  finishing: boolean;
};

const MAX_FEEDS = 10;

export function StepSources({ state, setState, onFinish, finishing }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failures, setFailures] = useState<
    Array<{ url: string; reason: string }>
  >([]);

  const validUrls = useMemo(
    () => parseUrls(state.feedUrls),
    [state.feedUrls],
  );
  const busy = saving || finishing;

  async function saveAndFinish() {
    setSaving(true);
    setError(null);
    setFailures([]);

    if (validUrls.length === 0) {
      onFinish();
      return;
    }

    try {
      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sources: validUrls.map((url) => ({ kind: "rss_feed", url })),
        }),
      });
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        if (Array.isArray(payload?.failures)) {
          setFailures(payload.failures);
        }
        setError("Could not add some feeds. Check the URLs and try again.");
        setSaving(false);
        return;
      }

      if (Array.isArray(payload?.failures) && payload.failures.length > 0) {
        setFailures(payload.failures);
      }

      onFinish();
    } catch {
      setError("Could not save these feeds.");
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-background p-6 shadow-sm">
      <div className="flex flex-col gap-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Add news feeds
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Pick a starter bundle, paste your own RSS URLs, or both. Up to {MAX_FEEDS}.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {NICHE_BUNDLES.map((bundle) => {
            const already = bundle.feeds.every((feed) =>
              state.feedUrls.includes(feed.url),
            );
            return (
              <button
                key={bundle.id}
                type="button"
                disabled={already || busy}
                className="group flex items-start gap-3 rounded-xl border bg-background p-3 text-left transition-colors hover:bg-muted/40 disabled:opacity-60"
                onClick={() => {
                  setState((current) => {
                    const existing = current.feedUrls
                      .split(/\r?\n/)
                      .map((line) => line.trim())
                      .filter(Boolean);
                    const next = [...existing];
                    for (const feed of bundle.feeds) {
                      if (!next.includes(feed.url)) next.push(feed.url);
                    }
                    return {
                      ...current,
                      feedUrls: next.slice(0, MAX_FEEDS).join("\n"),
                    };
                  });
                }}
              >
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">
                    {bundle.label}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {bundle.description}
                  </span>
                  <span className="mt-1 block text-[11px] text-muted-foreground">
                    {bundle.feeds.length} feeds
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <Textarea
          value={state.feedUrls}
          rows={7}
          placeholder={
            "https://hnrss.org/frontpage\nhttps://stratechery.com/feed/\nhttps://blog.cloudflare.com/rss/"
          }
          className="min-h-44 leading-relaxed font-mono text-xs"
          onChange={(event) =>
            setState((current) => ({
              ...current,
              feedUrls: event.target.value,
            }))
          }
        />

        <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>
            {validUrls.length}/{MAX_FEEDS} valid feed URLs
          </span>
          <button
            type="button"
            className="font-medium text-foreground underline-offset-4 hover:underline disabled:pointer-events-none disabled:opacity-50"
            disabled={busy}
            onClick={onFinish}
          >
            Skip
          </button>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {failures.length > 0 ? (
          <ul className="rounded-xl border bg-muted/30 p-3 text-xs text-muted-foreground">
            {failures.map((f) => (
              <li key={f.url} className="flex flex-col gap-0.5 py-1">
                <span className="font-mono">{f.url}</span>
                <span className="text-destructive">{f.reason}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex justify-end border-t pt-4">
          <Button
            type="button"
            disabled={busy}
            onClick={() => void saveAndFinish()}
          >
            {busy ? <CircularLoader size="sm" /> : null}
            Save and finish
          </Button>
        </div>
      </div>
    </div>
  );
}

function parseUrls(value: string) {
  const seen = new Set<string>();
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^https?:\/\//i.test(line))
    .filter((url) => {
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    })
    .slice(0, MAX_FEEDS);
}
