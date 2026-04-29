"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
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
import { PersonaForm } from "@/components/settings/persona-form";
import { ProfileForm } from "@/components/settings/profile-form";
import { MemorySection } from "@/components/settings/memory-section";
import { AccountSection } from "@/components/settings/account-section";
import { isProviderId } from "@/lib/providers";
import type {
  ActiveModel as Active,
  MemoryFileRow,
  ProviderKeyMetaRow,
  UserFactRow,
  UserProfileRow,
} from "@/lib/db/types";
import type { ProviderId } from "@/lib/providers";

export type SettingsView =
  | "home"
  | "keys"
  | "persona"
  | "profile"
  | "memory"
  | "account";

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
  initialFacts: UserFactRow[];
  initialMemoryFiles: MemoryFileRow[];
  email: string;
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
  persona: {
    title: "Bot persona",
    subtitle: "Name your assistant and describe how it should sound.",
  },
  profile: {
    title: "Channel profile",
    subtitle:
      "Niche, platforms, and pitch the bot uses for every recommendation.",
  },
  memory: {
    title: "Memory",
    subtitle: "Facts the bot has remembered and the knowledge files it loads.",
  },
  account: {
    title: "Account",
  },
};

export function SettingsDialogProvider({
  children,
  initialKeys,
  initialActive,
  profile,
  initialFacts,
  initialMemoryFiles,
  email,
}: ProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<SettingsView>("home");

  const provider: ProviderId = isProviderId(initialActive.provider)
    ? initialActive.provider
    : ("anthropic" as ProviderId);
  const active: Active = { provider, model: initialActive.model };

  const open = useCallback(() => {
    setView("home");
    setIsOpen(true);
  }, []);
  const openTo = useCallback((next: SettingsView) => {
    setView(next);
    setIsOpen(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      const t = window.setTimeout(() => setView("home"), 200);
      return () => window.clearTimeout(t);
    }
  }, [isOpen]);

  return (
    <SettingsDialogContext.Provider value={{ open, openTo }}>
      {children}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-2xl">
          {view === "home" ? (
            <DialogHeader>
              <DialogTitle>Settings</DialogTitle>
              <DialogDescription>
                Configure how the bot behaves, your profile, keys, and memory.
              </DialogDescription>
            </DialogHeader>
          ) : (
            <SectionHeader
              title={SECTION_TITLES[view].title}
              subtitle={SECTION_TITLES[view].subtitle}
              onBack={() => setView("home")}
            />
          )}

          <div className="max-h-[65vh] overflow-y-auto px-1">
            {view === "home" && <SettingsHome onSelect={setView} />}
            {view === "keys" && (
              <KeysForm initialKeys={initialKeys} initialActive={active} />
            )}
            {view === "persona" && (
              <PersonaForm
                initialName={profile?.assistant_name ?? null}
                initialPersona={profile?.assistant_persona ?? null}
              />
            )}
            {view === "profile" && profile && <ProfileForm profile={profile} />}
            {view === "memory" && (
              <MemorySection
                initialFacts={initialFacts}
                initialMemoryFiles={initialMemoryFiles}
              />
            )}
            {view === "account" && <AccountSection email={email} />}
          </div>
        </DialogContent>
      </Dialog>
    </SettingsDialogContext.Provider>
  );
}
