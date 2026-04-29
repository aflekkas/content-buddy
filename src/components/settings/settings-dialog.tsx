"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { AnimatePresence, motion } from "motion/react";
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
import { isProviderId } from "@/lib/providers";
import { useReducedMotionSafe } from "@/lib/motion";
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
  | "memory";

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
};

export function SettingsDialogProvider({
  children,
  initialKeys,
  initialActive,
  profile,
  initialFacts,
  initialMemoryFiles,
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
        <DialogContent className="top-[10vh] sm:max-w-2xl -translate-y-0">
          <SettingsBody
            view={view}
            setView={setView}
            initialKeys={initialKeys}
            active={active}
            profile={profile}
            initialFacts={initialFacts}
            initialMemoryFiles={initialMemoryFiles}
          />
        </DialogContent>
      </Dialog>
    </SettingsDialogContext.Provider>
  );
}

type BodyProps = {
  view: SettingsView;
  setView: (v: SettingsView) => void;
  initialKeys: ProviderKeyMetaRow[];
  active: Active;
  profile: UserProfileRow | null;
  initialFacts: UserFactRow[];
  initialMemoryFiles: MemoryFileRow[];
};

function SettingsBody({
  view,
  setView,
  initialKeys,
  active,
  profile,
  initialFacts,
  initialMemoryFiles,
}: BodyProps) {
  const reducedMotion = useReducedMotionSafe();
  // iOS "smooth" / "snappy" spring — visualDuration sets perceived length,
  // bounce: 0 = critically damped, no overshoot. Matches UIKit .smooth.
  const layoutSpring = {
    type: "spring" as const,
    visualDuration: 0.34,
    bounce: 0,
  };
  const fadeOut = { duration: 0.12, ease: [0.32, 0.72, 0, 1] as const };
  const fadeIn = { duration: 0.22, ease: [0.32, 0.72, 0, 1] as const, delay: 0.05 };

  const headerNode =
    view === "home" ? (
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
    );

  const bodyNode =
    view === "home" ? (
      <SettingsHome onSelect={setView} />
    ) : view === "keys" ? (
      <KeysForm initialKeys={initialKeys} initialActive={active} />
    ) : view === "persona" ? (
      <PersonaForm
        initialName={profile?.assistant_name ?? null}
        initialPersona={profile?.assistant_persona ?? null}
      />
    ) : view === "profile" && profile ? (
      <ProfileForm profile={profile} />
    ) : view === "memory" ? (
      <MemorySection
        initialFacts={initialFacts}
        initialMemoryFiles={initialMemoryFiles}
      />
    ) : null;

  return (
    <motion.div
      layout={reducedMotion ? false : "size"}
      transition={layoutSpring}
      className="flex flex-col gap-4"
      style={{ transformOrigin: "top" }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={`h-${view}`}
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1, transition: fadeIn }}
          exit={{ opacity: 0, transition: fadeOut }}
        >
          {headerNode}
        </motion.div>
      </AnimatePresence>

      <div className="max-h-[65vh] overflow-y-auto px-1">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={view}
            initial={reducedMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0, transition: fadeIn }}
            exit={{ opacity: 0, y: -4, transition: fadeOut }}
          >
            {bodyNode}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
