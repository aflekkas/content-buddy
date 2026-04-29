"use client";

import { FileText, ListVideo, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { ColumnHeader } from "@/components/cockpit/column-header";
import { TopBar } from "@/components/cockpit/topbar";
import { cn } from "@/lib/utils";

type Props = {
  user: { id: string; email: string };
  brandSlot: ReactNode;
  videoSlot: ReactNode;
  chatSwitcherSlot: ReactNode;
  children: ReactNode;
};

type MobilePanel = "memory" | "queue" | "chat";

const MOBILE_PANELS = [
  { id: "memory", label: "Memory", icon: FileText },
  { id: "queue", label: "Queue", icon: ListVideo },
  { id: "chat", label: "Chat", icon: Sparkles },
] as const satisfies ReadonlyArray<{
  id: MobilePanel;
  label: string;
  icon: LucideIcon;
}>;

export function CockpitShell({
  user,
  brandSlot,
  videoSlot,
  chatSwitcherSlot,
  children,
}: Props) {
  const [activePanel, setActivePanel] = useState<MobilePanel>("chat");

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <TopBar email={user.email} />

      <nav
        aria-label="Dashboard sections"
        className="grid h-12 shrink-0 grid-cols-3 border-b bg-background p-1 lg:hidden"
      >
        {MOBILE_PANELS.map((panel) => {
          const Icon = panel.icon;
          const active = activePanel === panel.id;

          return (
            <button
              key={panel.id}
              type="button"
              aria-pressed={active}
              onClick={() => setActivePanel(panel.id)}
              className={cn(
                "inline-flex min-w-0 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors",
                active
                  ? "bg-muted text-foreground"
                  : "hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="truncate">{panel.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="min-h-0 flex-1 lg:flex lg:flex-row">
        <div
          className={cn(
            "min-h-0 flex-1",
            activePanel === "memory" ? "flex" : "hidden",
            "lg:flex lg:h-full lg:w-[420px] lg:flex-none lg:border-r",
          )}
        >
          <aside className="flex min-h-0 flex-1 flex-col">{brandSlot}</aside>
        </div>

        <div
          className={cn(
            "min-h-0 flex-1",
            activePanel === "queue" ? "flex" : "hidden",
            "lg:flex lg:h-full lg:w-[360px] lg:flex-none lg:border-r",
          )}
        >
          <aside className="flex min-h-0 flex-1 flex-col">{videoSlot}</aside>
        </div>

        <div
          className={cn(
            "min-h-0 flex-1",
            activePanel === "chat" ? "flex" : "hidden",
            "lg:flex",
          )}
        >
          <section className="flex min-h-0 flex-1 flex-col">
            <ColumnHeader
              icon={Sparkles}
              titleSlot={chatSwitcherSlot}
            />
            <div className="min-h-0 flex-1">{children}</div>
          </section>
        </div>
      </div>
    </div>
  );
}
