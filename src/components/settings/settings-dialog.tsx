"use client";

import {
  createContext,
  useCallback,
  useContext,
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

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
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
      setKeys(keysData);
      setActive({ provider, model: activeData.model });
    } catch {
      setError("Could not load settings. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const openDialog = useCallback(() => {
    setIsOpen(true);
    void fetchSettings();
  }, [fetchSettings]);

  function handleOpenChange(open: boolean) {
    setIsOpen(open);
    if (!open) {
      setKeys(null);
      setActive(null);
      setError(null);
    }
  }

  return (
    <SettingsDialogContext.Provider value={{ open: openDialog }}>
      {children}
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Bring your own API key for any of these providers. Keys are stored
              encrypted at rest and only ever used to call the provider on your
              behalf.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[65vh] overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-10">
                <Loader variant="circular" size="md" />
              </div>
            )}
            {error && !loading && (
              <p className="py-6 text-center text-sm text-destructive">
                {error}
              </p>
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
