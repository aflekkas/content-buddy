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
  const [navState, setNavState] = useState<{
    view: SettingsView;
    direction: 1 | -1 | 0;
  }>({ view: "home", direction: 0 });
  const { view, direction } = navState;

  const navigate = useCallback((next: SettingsView) => {
    setNavState((prev) => ({
      view: next,
      direction: prev.view === next ? 0 : next === "home" ? -1 : 1,
    }));
  }, []);

  const provider: ProviderId = isProviderId(initialActive.provider)
    ? initialActive.provider
    : ("anthropic" as ProviderId);
  const active: Active = { provider, model: initialActive.model };

  const open = useCallback(() => {
    setNavState({ view: "home", direction: 0 });
    setIsOpen(true);
  }, []);
  const openTo = useCallback((next: SettingsView) => {
    setNavState({ view: next, direction: 1 });
    setIsOpen(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      const t = window.setTimeout(
        () => setNavState({ view: "home", direction: 0 }),
        200,
      );
      return () => window.clearTimeout(t);
    }
  }, [isOpen]);

  return (
    <SettingsDialogContext.Provider value={{ open, openTo }}>
      {children}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-2xl overflow-hidden">
          <SettingsBody
            view={view}
            direction={direction}
            navigate={navigate}
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
  direction: 1 | -1 | 0;
  navigate: (v: SettingsView) => void;
  initialKeys: ProviderKeyMetaRow[];
  active: Active;
  profile: UserProfileRow | null;
  initialFacts: UserFactRow[];
  initialMemoryFiles: MemoryFileRow[];
};

function SettingsBody({
  view,
  direction,
  navigate,
  initialKeys,
  active,
  profile,
  initialFacts,
  initialMemoryFiles,
}: BodyProps) {
  const reducedMotion = useReducedMotionSafe();

  // iOS spring: critically damped, ~340ms perceived. Matches UIKit .smooth.
  const spring = {
    type: "spring" as const,
    visualDuration: 0.34,
    bounce: 0,
  };

  const slideOffset = 24;

  const node =
    view === "home" ? (
      <ViewPane>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure how the bot behaves, your profile, keys, and memory.
          </DialogDescription>
        </DialogHeader>
        <SettingsHome onSelect={navigate} />
      </ViewPane>
    ) : (
      <ViewPane>
        <SectionHeader
          title={SECTION_TITLES[view].title}
          subtitle={SECTION_TITLES[view].subtitle}
          onBack={() => navigate("home")}
        />
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
      </ViewPane>
    );

  return (
    <motion.div
      layout={reducedMotion ? false : "size"}
      transition={spring}
      className="relative"
    >
      <AnimatePresence mode="popLayout" initial={false} custom={direction}>
        <motion.div
          key={view}
          custom={direction}
          variants={{
            enter: (dir: number) => ({
              x: reducedMotion ? 0 : dir * slideOffset,
              opacity: 0,
            }),
            center: { x: 0, opacity: 1 },
            exit: (dir: number) => ({
              x: reducedMotion ? 0 : -dir * slideOffset,
              opacity: 0,
            }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={spring}
          className="w-full"
        >
          {node}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

function ViewPane({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="max-h-[65vh] overflow-y-auto px-1">
        <div className="flex flex-col gap-4">{children}</div>
      </div>
    </div>
  );
}
