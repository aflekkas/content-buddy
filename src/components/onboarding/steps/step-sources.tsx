"use client";

import type { Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";
import type { OnboardingState } from "@/components/onboarding/onboarding-flow";
import { Button } from "@/components/ui/button";
import { CircularLoader } from "@/components/ui/loader";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  state: OnboardingState;
  setState: Dispatch<SetStateAction<OnboardingState>>;
  onFinish: () => void;
  finishing: boolean;
};

const HANDLE_RE = /^@?[A-Za-z0-9_]{1,15}$/;
const MAX_HANDLES = 5;

export function StepSources({ state, setState, onFinish, finishing }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validHandles = useMemo(
    () => parseHandles(state.nicheHandles),
    [state.nicheHandles],
  );
  const busy = saving || finishing;

  async function saveAndFinish() {
    setSaving(true);
    setError(null);

    try {
      await Promise.all(
        validHandles.map((handle) =>
          fetch("/api/sources", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              kind: "x_account",
              handle,
            }),
          }).then((res) => {
            if (!res.ok) throw new Error("source_failed");
          }),
        ),
      );

      onFinish();
    } catch {
      setError("Could not save these sources.");
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-background p-6 shadow-sm">
      <div className="flex flex-col gap-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Add niche sources
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Paste X handles, one per line. Up to 5.
          </p>
        </div>

        <Textarea
          value={state.nicheHandles}
          rows={7}
          placeholder={"@founder\n@builder\n@operator"}
          className="min-h-44 leading-relaxed"
          onChange={(event) =>
            setState((current) => ({
              ...current,
              nicheHandles: event.target.value,
            }))
          }
        />

        <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>{validHandles.length}/{MAX_HANDLES} valid handles</span>
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

        <div className="flex justify-end border-t pt-4">
          <Button type="button" disabled={busy} onClick={() => void saveAndFinish()}>
            {busy ? <CircularLoader size="sm" /> : null}
            Save and finish
          </Button>
        </div>
      </div>
    </div>
  );
}

function parseHandles(value: string) {
  const seen = new Set<string>();

  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => HANDLE_RE.test(line))
    .map((line) => line.replace(/^@/, "").toLowerCase())
    .filter((handle) => {
      if (seen.has(handle)) return false;
      seen.add(handle);
      return true;
    })
    .slice(0, MAX_HANDLES);
}
