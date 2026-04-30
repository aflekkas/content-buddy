"use client";

import { Brain, ChevronLeft, ListVideo, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
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
import { useActiveVideos } from "@/components/cockpit/active-videos-context";
import { EASE_OUT, useReducedMotionSafe } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Props = {
  user: { id: string; email: string };
  brandSlot?: ReactNode;
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
const RAIL_WIDTH = 56;
const PANEL_STATE_STORAGE_KEY = "shortform-studio:cockpit-panels";
const MEMORY_ICON_BUTTON_CLASS =
  "text-sky-600 hover:text-sky-700 dark:text-sky-300";
const QUEUE_ICON_BUTTON_CLASS =
  "text-amber-600 hover:text-amber-700 dark:text-amber-300";
const HEADER_ICON_BUTTON_CLASS =
  "inline-flex size-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

const PANEL_TRANSITION = { duration: 0.28, ease: EASE_OUT } as const;
const RAIL_TRANSITION = { duration: 0.22, ease: EASE_OUT } as const;
const VIDEO_TAB_TRANSITION = { duration: 0.18, ease: EASE_OUT } as const;
const VIDEO_TAB_WIDTH = 440;
const REDUCED_TRANSITION = { duration: 0 } as const;

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
  const {
    activeVideoIds,
    closeVideo,
    reorderVideos,
    closeAllVideos,
  } = useActiveVideos();
  const [activePanel, setActivePanel] = useState<MobilePanel>("chat");
  const [memoryCollapsed, setMemoryCollapsed] = useState<boolean>(
    DEFAULT_PANEL_STATE.memoryCollapsed,
  );
  const [videoCollapsed, setVideoCollapsed] = useState<boolean>(
    DEFAULT_PANEL_STATE.videoCollapsed,
  );
  const [chatCollapsed, setChatCollapsed] = useState<boolean>(
    DEFAULT_PANEL_STATE.chatCollapsed,
  );
  const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null);
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(
    null,
  );

  useEffect(() => {
    const stored = getStoredPanelState();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration sync from localStorage
    setMemoryCollapsed(stored.memoryCollapsed);
    setVideoCollapsed(stored.videoCollapsed);
    setChatCollapsed(stored.chatCollapsed);
  }, []);
  const hasActiveVideos = activeVideoIds.length > 0;
  const hasCollapsedRail = memoryCollapsed || videoCollapsed || chatCollapsed;
  const showEmptyCanvas =
    memoryCollapsed && videoCollapsed && chatCollapsed && !hasActiveVideos;
  const reducedMotion = useReducedMotionSafe();
  const panelTransition = reducedMotion ? REDUCED_TRANSITION : PANEL_TRANSITION;
  const railTransition = reducedMotion ? REDUCED_TRANSITION : RAIL_TRANSITION;
  const videoTabTransition = reducedMotion
    ? REDUCED_TRANSITION
    : VIDEO_TAB_TRANSITION;

  useEffect(() => {
    window.localStorage.setItem(
      PANEL_STATE_STORAGE_KEY,
      JSON.stringify({ memoryCollapsed, videoCollapsed, chatCollapsed }),
    );
  }, [chatCollapsed, memoryCollapsed, videoCollapsed]);

  function closeActiveVideo(videoId: string) {
    closeVideo(videoId);
  }

  function reorderActiveVideos(fromIndex: number, toIndex: number) {
    reorderVideos(fromIndex, toIndex);
  }

  function openChat(chatId: string) {
    closeAllVideos();
    router.push(`/dashboard/chat/${chatId}`, { scroll: false });
  }

  function expandMemoryPanel() {
    setMemoryCollapsed(false);
  }

  function expandVideoPanel() {
    setVideoCollapsed(false);
  }

  function expandChatPanel() {
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

      <TooltipProvider>
      <div className="min-h-0 flex-1 lg:flex lg:flex-row lg:overflow-x-auto">
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
                {memoryCollapsed ? (
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
                {chatCollapsed ? (
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

        <motion.div
          initial={false}
          animate={{
            "--memory-panel-width": `${
              memoryCollapsed ? 0 : MEMORY_PANEL_WIDTH
            }px`,
          }}
          transition={panelTransition}
          className={cn(
            "relative min-h-0 flex-1 overflow-hidden",
            activePanel === "memory" ? "flex" : "hidden",
            "lg:flex lg:h-full lg:w-[var(--memory-panel-width)] lg:flex-none lg:border-r",
            memoryCollapsed && "lg:border-r-0",
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

          <PanelButton
            label="Collapse memory"
            icon={ChevronLeft}
            onClick={() => setMemoryCollapsed(true)}
            className={memoryCollapsed && "lg:hidden"}
          />
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

          <PanelButton
            label="Collapse video queue"
            icon={ChevronLeft}
            onClick={() => setVideoCollapsed(true)}
            className={videoCollapsed && "lg:hidden"}
          />
        </motion.div>

        <AnimatePresence initial={false}>
          {activeVideoIds.map((videoId, idx) => {
            const isDragging = dragSourceIndex === idx;
            const showLeftIndicator = dropIndicatorIndex === idx;
            const showRightIndicator =
              dropIndicatorIndex === idx + 1 &&
              idx === activeVideoIds.length - 1;
            return (
              <motion.div
                key={videoId}
                initial={reducedMotion ? false : { width: 0, opacity: 0 }}
                animate={{
                  width: VIDEO_TAB_WIDTH,
                  opacity: isDragging ? 0.4 : 1,
                }}
                exit={
                  reducedMotion ? { opacity: 0 } : { width: 0, opacity: 0 }
                }
                transition={videoTabTransition}
                className="group relative hidden min-h-0 overflow-hidden lg:flex lg:h-full lg:flex-none lg:flex-col lg:border-r"
              >
                {showLeftIndicator && (
                  <span className="pointer-events-none absolute inset-y-0 left-0 z-30 w-0.5 bg-violet-500" />
                )}
                {showRightIndicator && (
                  <span className="pointer-events-none absolute inset-y-0 right-0 z-30 w-0.5 bg-violet-500" />
                )}
                <div
                  draggable
                  onDragStart={(e) => {
                    const target = e.target as HTMLElement;
                    if (
                      target.closest(
                        "[data-no-drag],input,textarea,button,a,select,[contenteditable='true']",
                      )
                    ) {
                      e.preventDefault();
                      return;
                    }
                    e.dataTransfer.setData(
                      "application/x-video-tab",
                      String(idx),
                    );
                    e.dataTransfer.effectAllowed = "move";
                    setDragSourceIndex(idx);
                  }}
                  onDragEnd={() => {
                    setDragSourceIndex(null);
                    setDropIndicatorIndex(null);
                  }}
                  onDragOver={(e) => {
                    if (
                      !e.dataTransfer.types.includes("application/x-video-tab")
                    ) {
                      return;
                    }
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    const rect = e.currentTarget.getBoundingClientRect();
                    const insertAfter =
                      e.clientX - rect.left > rect.width / 2;
                    setDropIndicatorIndex(insertAfter ? idx + 1 : idx);
                  }}
                  onDragLeave={(e) => {
                    const next = e.relatedTarget as Node | null;
                    if (next && e.currentTarget.contains(next)) return;
                    setDropIndicatorIndex((current) =>
                      current === idx || current === idx + 1 ? null : current,
                    );
                  }}
                  onDrop={(e) => {
                    const raw = e.dataTransfer.getData(
                      "application/x-video-tab",
                    );
                    setDropIndicatorIndex(null);
                    if (!raw) return;
                    e.preventDefault();
                    const from = Number(raw);
                    if (!Number.isFinite(from)) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const insertAfter =
                      e.clientX - rect.left > rect.width / 2;
                    let to = insertAfter ? idx + 1 : idx;
                    if (from < to) to -= 1;
                    reorderActiveVideos(from, to);
                  }}
                  className="flex h-full min-h-0 w-[440px] cursor-grab flex-col active:cursor-grabbing"
                >
                  <aside className="flex min-h-0 flex-1 flex-col">
                    <InlineVideoEditor
                      videoId={videoId}
                      onClose={() => closeActiveVideo(videoId)}
                      onOpenChat={openChat}
                    />
                  </aside>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        <motion.div
          initial={false}
          animate={{ opacity: chatCollapsed ? 0 : 1 }}
          transition={panelTransition}
          className={cn(
            "min-h-0 overflow-hidden",
            activePanel === "chat" ? "flex" : "hidden",
            chatCollapsed
              ? "lg:w-0 lg:flex-none"
              : "lg:flex lg:flex-1 lg:min-w-[480px]",
          )}
        >
          <section
            aria-hidden={chatCollapsed}
            inert={chatCollapsed ? true : undefined}
            className="flex min-h-0 flex-1 flex-col"
          >
            <ColumnHeader
              icon={Sparkles}
              iconTone="chat"
              titleSlot={chatSwitcherSlot}
              right={
                <button
                  type="button"
                  aria-label="Collapse chat"
                  title="Collapse chat"
                  onClick={() => setChatCollapsed(true)}
                  className={HEADER_ICON_BUTTON_CLASS}
                >
                  <ChevronLeft className="size-4" />
                </button>
              }
            />
            <div className="min-h-0 flex-1">{children}</div>
          </section>
        </motion.div>

        <AnimatePresence initial={false}>
          {showEmptyCanvas ? (
            <motion.div
              key="empty-canvas"
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0 }}
              transition={panelTransition}
              className="hidden min-h-0 lg:flex lg:flex-1 lg:items-center lg:justify-center"
            >
              <EmptyCanvas
                onExpandAll={() => {
                  setMemoryCollapsed(false);
                  setVideoCollapsed(false);
                  setChatCollapsed(false);
                }}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      </TooltipProvider>
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

const EMPTY_CANVAS_MESSAGES = [
  {
    title: "lights out.",
    body: "you minimized everything. bold move. tap a panel on the rail to bring it back.",
  },
  {
    title: "all tucked in.",
    body: "nothing's open. peek something from the rail or pop it all back.",
  },
  {
    title: "studio's quiet.",
    body: "every panel collapsed. enjoy the silence or open one back up.",
  },
  {
    title: "blank canvas.",
    body: "no panels, no chat, no queue. you're flying clean.",
  },
] as const;

function EmptyCanvas({ onExpandAll }: { onExpandAll: () => void }) {
  const [message] = useState(
    () =>
      EMPTY_CANVAS_MESSAGES[
        Math.floor(Math.random() * EMPTY_CANVAS_MESSAGES.length)
      ],
  );

  return (
    <div className="flex max-w-sm flex-col items-center gap-3 px-6 text-center">
      <p className="text-base font-medium text-foreground">{message.title}</p>
      <p className="text-sm text-muted-foreground">{message.body}</p>
      <button
        type="button"
        onClick={onExpandAll}
        className="mt-1 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        bring it all back
      </button>
    </div>
  );
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
