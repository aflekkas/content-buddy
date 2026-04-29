"use client";

import { Brain, ChevronLeft, ListVideo, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { ColumnHeader } from "@/components/cockpit/column-header";
import {
  CockpitFrame,
  cockpitIconButtonClass,
} from "@/components/cockpit/cockpit-primitives";
import { TopBar } from "@/components/cockpit/topbar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InlineVideoEditor } from "@/components/videos/inline-video-editor";
import { EASE_OUT, useReducedMotionSafe } from "@/lib/motion";
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
  { id: "memory", label: "Memory", icon: Brain },
  { id: "queue", label: "Queue", icon: ListVideo },
  { id: "chat", label: "Chat", icon: Sparkles },
] as const satisfies ReadonlyArray<{
  id: MobilePanel;
  label: string;
  icon: LucideIcon;
}>;

const MEMORY_PANEL_WIDTH = 420;
const VIDEO_PANEL_WIDTH = 360;
const VIDEO_EDITOR_PANEL_WIDTH = 440;
const RAIL_WIDTH = 56;
const PANEL_STATE_STORAGE_KEY = "shortform-studio:cockpit-panels";
const MEMORY_ICON_BUTTON_CLASS =
  "text-sky-600 hover:text-sky-700 dark:text-sky-300";
const QUEUE_ICON_BUTTON_CLASS =
  "text-amber-600 hover:text-amber-700 dark:text-amber-300";
const HEADER_ICON_BUTTON_CLASS =
  "inline-flex size-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

type StoredPanelState = {
  memoryCollapsed?: boolean;
  videoCollapsed?: boolean;
  chatCollapsed?: boolean;
};

const DEFAULT_PANEL_STATE = {
  memoryCollapsed: true,
  videoCollapsed: false,
  chatCollapsed: false,
} as const;

export function CockpitShell({
  user,
  brandSlot,
  videoSlot,
  chatSwitcherSlot,
  children,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activePanel, setActivePanel] = useState<MobilePanel>("chat");
  const [memoryCollapsed, setMemoryCollapsed] = useState(
    () => getStoredPanelState().memoryCollapsed,
  );
  const [videoCollapsed, setVideoCollapsed] = useState(
    () => getStoredPanelState().videoCollapsed,
  );
  const [chatCollapsed, setChatCollapsed] = useState(
    () => getStoredPanelState().chatCollapsed,
  );
  const activeVideoId = searchParams.get("video");
  const chatCanCollapse = Boolean(activeVideoId);
  const effectiveChatCollapsed = chatCanCollapse && chatCollapsed;
  const effectiveMemoryCollapsed =
    memoryCollapsed ||
    Boolean(activeVideoId && !videoCollapsed && !effectiveChatCollapsed);
  const hasCollapsedRail =
    effectiveMemoryCollapsed || videoCollapsed || effectiveChatCollapsed;
  const reducedMotion = useReducedMotionSafe();
  const panelTransition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.28, ease: EASE_OUT };
  const railTransition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.22, ease: EASE_OUT };

  useEffect(() => {
    window.localStorage.setItem(
      PANEL_STATE_STORAGE_KEY,
      JSON.stringify({ memoryCollapsed, videoCollapsed, chatCollapsed }),
    );
  }, [chatCollapsed, memoryCollapsed, videoCollapsed]);

  function setActiveVideoId(videoId: string | null) {
    if (videoId && !activeVideoId) setChatCollapsed(false);
    if (!videoId) setChatCollapsed(false);

    const params = new URLSearchParams(searchParams.toString());
    if (videoId) params.set("video", videoId);
    else params.delete("video");

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function openChat(chatId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("video");
    const query = params.toString();
    router.push(
      query ? `/dashboard/chat/${chatId}?${query}` : `/dashboard/chat/${chatId}`,
      { scroll: false },
    );
  }

  function expandMemoryPanel() {
    if (activeVideoId && !videoCollapsed && !effectiveChatCollapsed) {
      setChatCollapsed(true);
    }
    setMemoryCollapsed(false);
  }

  function expandVideoPanel() {
    if (activeVideoId && !effectiveMemoryCollapsed && !effectiveChatCollapsed) {
      setMemoryCollapsed(true);
    }
    setVideoCollapsed(false);
  }

  function expandChatPanel() {
    if (activeVideoId && !effectiveMemoryCollapsed && !videoCollapsed) {
      setMemoryCollapsed(true);
    }
    setChatCollapsed(false);
  }

  return (
    <CockpitFrame>
      <TopBar email={user.email} />

      <nav
        aria-label="Dashboard sections"
        className="grid h-11 shrink-0 grid-cols-3 border-b bg-background p-1 lg:hidden"
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
                if (panel.id === "memory") expandMemoryPanel();
                if (panel.id === "queue") expandVideoPanel();
                if (panel.id === "chat") expandChatPanel();
              }}
              className={cn(
                "inline-flex min-w-0 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors",
                active
                  ? "bg-muted/70 text-foreground"
                  : "hover:bg-muted/50 hover:text-foreground",
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
          <motion.aside
            aria-label="Collapsed workspace panels"
            initial={false}
            animate={{
              "--rail-width": `${hasCollapsedRail ? RAIL_WIDTH : 0}px`,
              opacity: hasCollapsedRail ? 1 : 0,
              borderRightWidth: hasCollapsedRail ? 1 : 0,
            }}
            transition={railTransition}
            className="hidden min-h-0 shrink-0 overflow-hidden border-r bg-muted/40 lg:flex lg:w-[var(--rail-width)]"
          >
            <div className="flex w-14 shrink-0 flex-col items-center gap-2 px-2 py-3">
              <AnimatePresence initial={false} mode="popLayout">
                {effectiveMemoryCollapsed ? (
                  <motion.div
                    key="memory"
                    layout
                    initial={reducedMotion ? false : { opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
                    transition={railTransition}
                  >
                    <RailButton
                      label="Expand memory"
                      icon={Brain}
                      className={MEMORY_ICON_BUTTON_CLASS}
                      iconClassName="size-4.5"
                      onClick={expandMemoryPanel}
                    />
                  </motion.div>
                ) : null}
                {videoCollapsed ? (
                  <motion.div
                    key="queue"
                    layout
                    initial={reducedMotion ? false : { opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
                    transition={railTransition}
                  >
                    <RailButton
                      label="Expand video queue"
                      icon={ListVideo}
                      className={QUEUE_ICON_BUTTON_CLASS}
                      onClick={expandVideoPanel}
                    />
                  </motion.div>
                ) : null}
                {effectiveChatCollapsed ? (
                  <motion.div
                    key="chat"
                    layout
                    initial={reducedMotion ? false : { opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
                    transition={railTransition}
                  >
                    <RailButton
                      label="Expand chat"
                      icon={Sparkles}
                      className="text-violet-600 hover:text-violet-700 dark:text-violet-300"
                      onClick={expandChatPanel}
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </motion.aside>
        </TooltipProvider>

        <motion.div
          initial={false}
          animate={{
            "--memory-panel-width": `${
              effectiveMemoryCollapsed ? 0 : MEMORY_PANEL_WIDTH
            }px`,
          }}
          transition={panelTransition}
          className={cn(
            "relative min-h-0 flex-1 overflow-hidden",
            activePanel === "memory" ? "flex" : "hidden",
            "lg:flex lg:h-full lg:w-[var(--memory-panel-width)] lg:flex-none lg:border-r",
            effectiveMemoryCollapsed && "lg:border-r-0",
          )}
        >
          <aside
            aria-hidden={effectiveMemoryCollapsed}
            inert={effectiveMemoryCollapsed ? true : undefined}
            className={cn(
              "flex min-h-0 flex-1 flex-col transition-opacity duration-150 lg:w-[420px] lg:flex-none",
              effectiveMemoryCollapsed && "lg:pointer-events-none lg:opacity-0",
            )}
          >
            {brandSlot}
          </aside>

          <TooltipProvider>
            <PanelButton
              label="Collapse memory"
              icon={ChevronLeft}
              onClick={() => setMemoryCollapsed(true)}
              className={effectiveMemoryCollapsed && "lg:hidden"}
            />
          </TooltipProvider>
        </motion.div>

        <motion.div
          initial={false}
          animate={{
            "--video-panel-width": `${videoCollapsed ? 0 : VIDEO_PANEL_WIDTH}px`,
          }}
          transition={panelTransition}
          className={cn(
            "relative min-h-0 flex-1 overflow-hidden",
            activePanel === "queue" ? "flex" : "hidden",
            "lg:flex lg:h-full lg:w-[var(--video-panel-width)] lg:flex-none lg:border-r",
            videoCollapsed && "lg:border-r-0",
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
        </motion.div>

        <motion.div
          initial={false}
          animate={{
            "--video-editor-panel-width": `${
              activeVideoId ? VIDEO_EDITOR_PANEL_WIDTH : 0
            }px`,
          }}
          transition={panelTransition}
          className={cn(
            "relative min-h-0 flex-1 overflow-hidden",
            activePanel === "chat" ? "hidden" : "hidden",
            "lg:flex lg:h-full lg:w-[var(--video-editor-panel-width)] lg:flex-none",
            activeVideoId && "lg:border-r",
          )}
        >
          <aside
            aria-hidden={!activeVideoId}
            inert={!activeVideoId ? true : undefined}
            className={cn(
              "flex min-h-0 flex-1 flex-col transition-opacity duration-150 lg:w-[440px] lg:flex-none",
              !activeVideoId && "lg:pointer-events-none lg:opacity-0",
            )}
          >
            {activeVideoId ? (
              <InlineVideoEditor
                key={activeVideoId}
                videoId={activeVideoId}
                onClose={() => setActiveVideoId(null)}
                onOpenChat={openChat}
              />
            ) : null}
          </aside>
        </motion.div>

        <motion.div
          initial={false}
          animate={{ opacity: effectiveChatCollapsed ? 0 : 1 }}
          transition={panelTransition}
          className={cn(
            "min-h-0 overflow-hidden",
            activePanel === "chat" ? "flex" : "hidden",
            effectiveChatCollapsed
              ? "lg:w-0 lg:flex-none"
              : "lg:flex lg:flex-1",
          )}
        >
          <section
            aria-hidden={effectiveChatCollapsed}
            inert={effectiveChatCollapsed ? true : undefined}
            className="flex min-h-0 flex-1 flex-col"
          >
            <ColumnHeader
              icon={Sparkles}
              iconTone="chat"
              titleSlot={chatSwitcherSlot}
              right={
                activeVideoId ? (
                  <button
                    type="button"
                    aria-label="Collapse chat"
                    title="Collapse chat"
                    onClick={() => setChatCollapsed(true)}
                    className={HEADER_ICON_BUTTON_CLASS}
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                ) : null
              }
            />
            <div className="min-h-0 flex-1">{children}</div>
          </section>
        </motion.div>
      </div>
    </CockpitFrame>
  );
}

function getStoredPanelState() {
  if (typeof window === "undefined") return DEFAULT_PANEL_STATE;

  try {
    const raw = window.localStorage.getItem(PANEL_STATE_STORAGE_KEY);
    if (!raw) return DEFAULT_PANEL_STATE;

    const stored = JSON.parse(raw) as StoredPanelState;
    return {
      memoryCollapsed:
        typeof stored.memoryCollapsed === "boolean"
          ? stored.memoryCollapsed
          : DEFAULT_PANEL_STATE.memoryCollapsed,
      videoCollapsed:
        typeof stored.videoCollapsed === "boolean"
          ? stored.videoCollapsed
          : DEFAULT_PANEL_STATE.videoCollapsed,
      chatCollapsed:
        typeof stored.chatCollapsed === "boolean"
          ? stored.chatCollapsed
          : DEFAULT_PANEL_STATE.chatCollapsed,
    };
  } catch {
    window.localStorage.removeItem(PANEL_STATE_STORAGE_KEY);
    return DEFAULT_PANEL_STATE;
  }
}

function RailButton({
  label,
  icon: Icon,
  className,
  iconClassName,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  className?: string;
  iconClassName?: string;
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
            className={cn(cockpitIconButtonClass, className)}
          >
            <Icon className={cn("size-4", iconClassName)} />
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
              "absolute right-3 top-2.5 z-10 hidden lg:flex",
              HEADER_ICON_BUTTON_CLASS,
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
