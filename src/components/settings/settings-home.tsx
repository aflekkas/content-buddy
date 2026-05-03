"use client";

import { ChevronRight, KeyRound, User } from "lucide-react";
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
    title: "Keys & integrations",
    subtitle: "OpenAI key, optional Apify token, and active model",
    icon: KeyRound,
  },
  {
    view: "profile",
    title: "Creator profile",
    subtitle: "Niche, voice notes, voice samples, and feeds",
    icon: User,
  },
];

type Props = {
  onSelect: (view: SettingsView) => void;
};

export function SettingsHome({ onSelect }: Props) {
  return (
    <Stagger className="grid auto-rows-fr grid-cols-1 gap-2 sm:grid-cols-2">
      {CARDS.map((card) => (
        <StaggerItem key={card.view} className="h-full">
          <button
            type="button"
            onClick={() => onSelect(card.view)}
            className={cn(
              "group flex h-full w-full items-center gap-3 rounded-xl border bg-background p-4 text-left transition-colors",
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
