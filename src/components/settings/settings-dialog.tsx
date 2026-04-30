"use client";

import { createContext, useCallback, useContext, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KeysForm } from "@/components/settings/keys-form";
import { SettingsHome } from "@/components/settings/settings-home";
import { SectionHeader } from "@/components/settings/section-header";
import { ProfileForm } from "@/components/settings/profile-form";
import { isProviderId } from "@/lib/providers";
import type {
  ActiveModel as Active,
  ProviderKeyMetaRow,
  UserProfileRow,
} from "@/lib/db/types";
import type { ProviderId } from "@/lib/providers";

export type SettingsView = "home" | "keys" | "profile";

type SettingsDialogContextValue = {
  open: () => void;
  openTo: (view: SettingsView) => void;
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

type ProviderProps = {
  children: React.ReactNode;
  initialKeys: ProviderKeyMetaRow[];
  initialActive: { provider: string; model: string };
  profile: UserProfileRow | null;
};

const SECTION_TITLES: Record<
  Exclude<SettingsView, "home">,
  { title: string; subtitle?: string }
> = {
  keys: {
    title: "Models & keys",
    subtitle:
      "Bring your own API key. Keys are encrypted at rest and only used to call the provider on your behalf.",
  },
  profile: {
    title: "Creator profile",
    subtitle: "Niche and voice notes used for every response.",
  },
};

export function SettingsDialogProvider({
  children,
  initialKeys,
  initialActive,
  profile,
}: ProviderProps) {
  // "closed" = no dialog visible. Otherwise the value is which view is open.
  const [view, setView] = useState<SettingsView | "closed">("closed");

  const provider: ProviderId = isProviderId(initialActive.provider)
    ? initialActive.provider
    : "openai";
  const active: Active = { provider, model: initialActive.model };

  const open = useCallback(() => setView("home"), []);
  const openTo = useCallback((next: SettingsView) => setView(next), []);
  const close = useCallback(() => setView("closed"), []);

  // Each view is its own dialog. Switching views = old dialog exits + new
  // dialog enters via the base-ui Dialog primitive's built-in fade/scale.
  function dialogOpen(target: SettingsView) {
    return view === target;
  }
  function handleOpenChange(target: SettingsView) {
    return (next: boolean) => {
      if (!next && view === target) close();
    };
  }

  return (
    <SettingsDialogContext.Provider value={{ open: open, openTo }}>
      {children}

      <Dialog open={dialogOpen("home")} onOpenChange={handleOpenChange("home")}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Configure your profile and OpenAI key.
            </DialogDescription>
          </DialogHeader>
          <SettingsHome onSelect={(v) => setView(v)} />
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen("keys")} onOpenChange={handleOpenChange("keys")}>
        <DialogContent className="sm:max-w-2xl">
          <SectionHeader
            title={SECTION_TITLES.keys.title}
            subtitle={SECTION_TITLES.keys.subtitle}
            onBack={() => setView("home")}
          />
          <div className="max-h-[65vh] overflow-y-auto px-1">
            <KeysForm initialKeys={initialKeys} initialActive={active} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogOpen("profile")}
        onOpenChange={handleOpenChange("profile")}
      >
        <DialogContent className="sm:max-w-2xl">
          <SectionHeader
            title={SECTION_TITLES.profile.title}
            subtitle={SECTION_TITLES.profile.subtitle}
            onBack={() => setView("home")}
          />
          <div className="max-h-[65vh] overflow-y-auto px-1">
            {profile && <ProfileForm profile={profile} />}
          </div>
        </DialogContent>
      </Dialog>
    </SettingsDialogContext.Provider>
  );
}
