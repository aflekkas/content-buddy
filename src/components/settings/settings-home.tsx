"use client";

import {
  Brain,
  ChevronRight,
  KeyRound,
  Sparkles,
  User,
  UserCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Stagger, StaggerItem } from "@/components/ui/motion";
import { cn } from "@/lib/utils";
import type { SettingsView } from "./settings-dialog";

type Card = {
  view: SettingsView;
  title: string;
  subtitle: string;
  icon: LucideIcon;
};

const CARDS: Card[] = [
  {
    view: "keys",
    title: "Models & keys",
    subtitle: "Active model and BYOK provider keys",
    icon: KeyRound,
  },
  {
    view: "persona",
    title: "Bot persona",
    subtitle: "Name your assistant and shape its voice",
    icon: Sparkles,
  },
  {
    view: "profile",
    title: "Channel profile",
    subtitle: "Niche, platforms, and pitch",
    icon: User,
  },
  {
    view: "memory",
    title: "Memory",
    subtitle: "Remembered facts and knowledge files",
    icon: Brain,
  },
  {
    view: "account",
    title: "Account",
    subtitle: "Email and sign out",
    icon: UserCircle,
  },
];

type Props = {
  onSelect: (view: SettingsView) => void;
};

export function SettingsHome({ onSelect }: Props) {
  return (
    <Stagger className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {CARDS.map((card) => (
        <StaggerItem key={card.view}>
          <button
            type="button"
            onClick={() => onSelect(card.view)}
            className={cn(
              "group flex w-full items-center gap-3 rounded-xl border bg-background p-4 text-left transition-colors",
              "hover:bg-muted/50 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            )}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
              <card.icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{card.title}</span>
              <span className="block text-xs text-muted-foreground">
                {card.subtitle}
              </span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </button>
        </StaggerItem>
      ))}
    </Stagger>
  );
}
