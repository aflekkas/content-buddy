"use client";

import { ChevronLeft, FileText, ListVideo, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { ColumnHeader } from "@/components/cockpit/column-header";
import { TopBar } from "@/components/cockpit/topbar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  const [memoryCollapsed, setMemoryCollapsed] = useState(false);
  const [videoCollapsed, setVideoCollapsed] = useState(false);
  const hasCollapsedRail = memoryCollapsed || videoCollapsed;

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
              onClick={() => {
                setActivePanel(panel.id);
                if (panel.id === "memory") setMemoryCollapsed(false);
                if (panel.id === "queue") setVideoCollapsed(false);
              }}
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
        <TooltipProvider>
          <aside
            aria-label="Collapsed workspace panels"
            className={cn(
              "hidden min-h-0 w-14 shrink-0 flex-col items-center gap-2 border-r bg-muted/50 px-2 py-3 lg:flex",
              !hasCollapsedRail && "lg:hidden",
            )}
          >
            {memoryCollapsed ? (
              <RailButton
                label="Expand memory"
                icon={FileText}
                onClick={() => setMemoryCollapsed(false)}
              />
            ) : null}
            {videoCollapsed ? (
              <RailButton
                label="Expand video queue"
                icon={ListVideo}
                onClick={() => setVideoCollapsed(false)}
              />
            ) : null}
          </aside>
        </TooltipProvider>

        <div
          className={cn(
            "relative min-h-0 flex-1 overflow-hidden transition-[width] duration-200 ease-out",
            activePanel === "memory" ? "flex" : "hidden",
            "lg:flex lg:h-full lg:flex-none",
            memoryCollapsed ? "lg:w-0" : "lg:w-[420px] lg:border-r",
          )}
        >
          <aside
            aria-hidden={memoryCollapsed}
            inert={memoryCollapsed ? true : undefined}
            className={cn(
              "flex min-h-0 flex-1 flex-col transition-opacity duration-150 lg:w-[420px] lg:flex-none",
              memoryCollapsed && "lg:pointer-events-none lg:opacity-0",
            )}
          >
            {brandSlot}
          </aside>

          <TooltipProvider>
            <PanelButton
              label="Collapse memory"
              icon={ChevronLeft}
              onClick={() => setMemoryCollapsed(true)}
              className={memoryCollapsed && "lg:hidden"}
            />
          </TooltipProvider>
        </div>

        <div
          className={cn(
            "relative min-h-0 flex-1 overflow-hidden transition-[width] duration-200 ease-out",
            activePanel === "queue" ? "flex" : "hidden",
            "lg:flex lg:h-full lg:flex-none",
            videoCollapsed ? "lg:w-0" : "lg:w-[360px] lg:border-r",
          )}
        >
          <aside
            aria-hidden={videoCollapsed}
            inert={videoCollapsed ? true : undefined}
            className={cn(
              "flex min-h-0 flex-1 flex-col transition-opacity duration-150 lg:w-[360px] lg:flex-none",
              videoCollapsed && "lg:pointer-events-none lg:opacity-0",
            )}
          >
            {videoSlot}
          </aside>

          <TooltipProvider>
            <PanelButton
              label="Collapse video queue"
              icon={ChevronLeft}
              onClick={() => setVideoCollapsed(true)}
              className={videoCollapsed && "lg:hidden"}
            />
          </TooltipProvider>
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

function RailButton({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={label}
            onClick={onClick}
            className="flex size-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Icon className="size-4" />
          </button>
        }
      />
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function PanelButton({
  label,
  icon: Icon,
  onClick,
  className,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  className?: string | false;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={label}
            onClick={onClick}
            className={cn(
              "absolute right-3 top-3 z-10 hidden size-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:flex",
              className,
            )}
          >
            <Icon className="size-4" />
          </button>
        }
      />
      <TooltipContent side="left">{label}</TooltipContent>
    </Tooltip>
  );
}
