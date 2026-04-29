"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import { KeysForm } from "@/components/settings/keys-form";
import { isProviderId } from "@/lib/providers";
import type { ProviderKeyMetaRow } from "@/lib/db/types";
import type { ProviderId } from "@/lib/providers";

type Active = { provider: ProviderId; model: string };

type SettingsDialogContextValue = {
  open: () => void;
};

const SettingsDialogContext = createContext<SettingsDialogContextValue | null>(
  null,
);

export function useSettingsDialog(): SettingsDialogContextValue {
  const ctx = useContext(SettingsDialogContext);
  if (!ctx) {
    throw new Error("useSettingsDialog must be used inside SettingsDialogProvider");
  }
  return ctx;
}

async function loadSettingsData() {
  const [keysRes, activeRes] = await Promise.all([
    fetch("/api/settings/keys"),
    fetch("/api/settings/active-model"),
  ]);
  if (!keysRes.ok || !activeRes.ok) {
    throw new Error("fetch_failed");
  }
  const [keysData, activeData] = await Promise.all([
    keysRes.json() as Promise<ProviderKeyMetaRow[]>,
    activeRes.json() as Promise<{ provider: string; model: string }>,
  ]);
  const provider = isProviderId(activeData.provider)
    ? activeData.provider
    : ("anthropic" as ProviderId);
  return { keys: keysData, active: { provider, model: activeData.model } };
}

export function SettingsDialogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [keys, setKeys] = useState<ProviderKeyMetaRow[] | null>(null);
  const [active, setActive] = useState<Active | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prefetchedRef = useRef(false);

  // Prefetch silently on mount — no loading spinner, just populate cache
  useEffect(() => {
    if (prefetchedRef.current) return;
    prefetchedRef.current = true;
    loadSettingsData()
      .then(({ keys: k, active: a }) => {
        setKeys(k);
        setActive(a);
      })
      .catch(() => {
        // Silently ignore prefetch errors; user will see error if they open the dialog
      });
  }, []);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { keys: k, active: a } = await loadSettingsData();
      setKeys(k);
      setActive(a);
    } catch {
      setError("Could not load settings. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const openDialog = useCallback(() => {
    setIsOpen(true);
    // If data isn't ready yet or previous fetch errored, trigger a full fetch
    if (error || (keys === null && active === null)) {
      void fetchSettings();
    }
  }, [fetchSettings, error, keys, active]);

  function handleOpenChange(open: boolean) {
    setIsOpen(open);
    if (!open) {
      setError(null);
      // Keep keys/active cached for next open
    }
  }

  return (
    <SettingsDialogContext.Provider value={{ open: openDialog }}>
      {children}
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Bring your own API key for any of these providers. Keys are stored
              encrypted at rest and only ever used to call the provider on your
              behalf.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[65vh] overflow-y-auto px-1">
            {loading && keys === null && (
              <div className="flex items-center justify-center py-10">
                <Loader variant="circular" size="md" />
              </div>
            )}
            {error && !loading && (
              <div className="flex flex-col items-center gap-3 py-6">
                <p className="text-center text-sm text-destructive">
                  {error}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void fetchSettings()}
                >
                  Retry
                </Button>
              </div>
            )}
            {!loading && !error && keys !== null && active !== null && (
              <KeysForm initialKeys={keys} initialActive={active} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </SettingsDialogContext.Provider>
  );
}
