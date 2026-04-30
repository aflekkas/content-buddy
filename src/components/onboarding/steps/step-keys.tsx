"use client";

import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import type { OnboardingState } from "@/components/onboarding/onboarding-flow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CircularLoader } from "@/components/ui/loader";

type Props = {
  state: OnboardingState;
  setState: Dispatch<SetStateAction<OnboardingState>>;
  onContinue: () => void;
};

type SaveTarget = "openai" | "apify";

export function StepKeys({ state, setState, onContinue }: Props) {
  const [saving, setSaving] = useState<SaveTarget | null>(null);
  const [openaiError, setOpenaiError] = useState<string | null>(null);
  const [apifyError, setApifyError] = useState<string | null>(null);
  const [apifyOptional, setApifyOptional] = useState(false);

  const openaiKeyValid = state.openaiKey.trim().startsWith("sk-");
  const canContinue =
    state.openaiKeySaved && (state.apifyTokenSaved || apifyOptional);

  async function saveOpenAIKey() {
    if (!openaiKeyValid) {
      setOpenaiError("OpenAI keys start with sk-.");
      return;
    }

    setSaving("openai");
    setOpenaiError(null);

    try {
      const res = await fetch("/api/settings/keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "openai",
          key: state.openaiKey.trim(),
        }),
      });

      if (!res.ok) throw new Error("save_failed");

      setState((current) => ({ ...current, openaiKeySaved: true }));
    } catch {
      setOpenaiError("Could not validate this OpenAI key.");
    } finally {
      setSaving(null);
    }
  }

  async function saveApifyToken() {
    if (!state.apifyToken.trim()) {
      setApifyError("Paste your Apify token to continue.");
      return;
    }

    setSaving("apify");
    setApifyError(null);

    try {
      const res = await fetch("/api/settings/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "apify",
          token: state.apifyToken.trim(),
        }),
      });

      if (res.status === 404) {
        setApifyError(
          "Apify integration ready in next deploy - for now you can skip.",
        );
        setApifyOptional(true);
        return;
      }

      if (!res.ok) throw new Error("save_failed");

      setState((current) => ({ ...current, apifyTokenSaved: true }));
    } catch {
      setApifyError("Could not validate this Apify token.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="rounded-2xl border bg-background p-6 shadow-sm">
      <div className="flex flex-col gap-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Connect your keys
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Add OpenAI for writing and Apify for X collection.
          </p>
        </div>

        <section className="rounded-2xl border bg-muted/20 p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <Label htmlFor="openai-key">OpenAI key</Label>
                <p className="text-xs text-muted-foreground">
                  From platform.openai.com/api-keys
                </p>
              </div>
              {state.openaiKeySaved ? <SavedBadge /> : null}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="openai-key"
                type="password"
                value={state.openaiKey}
                disabled={state.openaiKeySaved}
                aria-invalid={Boolean(openaiError)}
                placeholder="sk-..."
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    openaiKey: event.target.value,
                    openaiKeySaved: false,
                  }))
                }
              />
              <Button
                type="button"
                variant="outline"
                disabled={state.openaiKeySaved || saving === "openai"}
                onClick={() => void saveOpenAIKey()}
              >
                {saving === "openai" ? <CircularLoader size="sm" /> : null}
                Validate
              </Button>
            </div>
            {openaiError ? (
              <p className="text-sm text-destructive">{openaiError}</p>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border bg-muted/20 p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <Label htmlFor="apify-token">Apify token</Label>
                <p className="text-xs text-muted-foreground">
                  From console.apify.com/account/integrations. Free tier covers
                  most users.
                </p>
              </div>
              {state.apifyTokenSaved ? <SavedBadge /> : null}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="apify-token"
                type="password"
                value={state.apifyToken}
                disabled={state.apifyTokenSaved}
                aria-invalid={Boolean(apifyError)}
                placeholder="Paste token"
                onChange={(event) => {
                  setApifyOptional(false);
                  setState((current) => ({
                    ...current,
                    apifyToken: event.target.value,
                    apifyTokenSaved: false,
                  }));
                }}
              />
              <Button
                type="button"
                variant="outline"
                disabled={state.apifyTokenSaved || saving === "apify"}
                onClick={() => void saveApifyToken()}
              >
                {saving === "apify" ? <CircularLoader size="sm" /> : null}
                Validate
              </Button>
            </div>
            {apifyError ? (
              <p className="text-sm text-destructive">{apifyError}</p>
            ) : null}
          </div>
        </section>

        <div className="flex justify-end border-t pt-4">
          <Button type="button" disabled={!canContinue} onClick={onContinue}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}

function SavedBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600">
      <CheckCircle2 className="size-4" />
      Saved
    </span>
  );
}
