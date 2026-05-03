"use client";

import { createContext, useCallback, useContext, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProfileForm } from "@/components/settings/profile-form";
import type { UserProfileRow } from "@/lib/db/types";

export type SettingsView = "profile";

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
    throw new Error(
      "useSettingsDialog must be used inside SettingsDialogProvider",
    );
  }
  return ctx;
}

type ProviderProps = {
  children: React.ReactNode;
  profile: UserProfileRow | null;
};

export function SettingsDialogProvider({
  children,
  profile,
}: ProviderProps) {
  const [open, setOpen] = useState(false);

  const openSettings = useCallback(() => setOpen(true), []);
  const openTo = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  return (
    <SettingsDialogContext.Provider value={{ open: openSettings, openTo }}>
      {children}

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) close();
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Creator profile</DialogTitle>
            <DialogDescription>
              Niche, voice notes, and writing samples. Manage feeds in News.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[65vh] overflow-y-auto px-1">
            {profile && <ProfileForm profile={profile} />}
          </div>
        </DialogContent>
      </Dialog>
    </SettingsDialogContext.Provider>
  );
}
