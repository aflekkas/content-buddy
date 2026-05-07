"use client";

import {
  Brain,
  ChevronLeft,
  FileText,
  Newspaper,
  Settings as SettingsIcon,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode, WheelEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { InlineDraftEditor } from "@/components/drafts/inline-draft-editor";
import { useActiveDrafts } from "@/components/cockpit/active-drafts-context";
import { EASE_OUT, useReducedMotionSafe } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Props = {
  user: { id: string; email: string };
  memorySlot: ReactNode;
  draftsSlot: ReactNode;
  newsSlot: ReactNode;
  settingsSlot: ReactNode;
  chatSwitcherSlot: ReactNode;
  children: ReactNode;
};

type MobilePanel = "memory" | "drafts" | "news" | "settings" | "chat";

const MOBILE_PANELS = [
  { id: "settings", label: "Settings", icon: SettingsIcon },
  { id: "memory", label: "Memory", icon: Brain },
  { id: "news", label: "News", icon: Newspaper },
  { id: "drafts", label: "Drafts", icon: FileText },
  { id: "chat", label: "Chat", icon: Sparkles },
] as const satisfies ReadonlyArray<{
  id: MobilePanel;
  label: string;
  icon: LucideIcon;
}>;

const MEMORY_PANEL_WIDTH = 320;
const DRAFTS_PANEL_WIDTH = 320;
const NEWS_PANEL_WIDTH = 340;
const SETTINGS_PANEL_WIDTH = 380;
const RAIL_WIDTH = 56;
const PANEL_STATE_STORAGE_KEY = "linkedin-studio:cockpit-panels:v3";
const MEMORY_ICON_BUTTON_CLASS =
  "text-sky-600 hover:text-sky-700 dark:text-sky-300";
const DRAFTS_ICON_BUTTON_CLASS =
  "text-amber-600 hover:text-amber-700 dark:text-amber-300";
const NEWS_ICON_BUTTON_CLASS =
  "text-emerald-600 hover:text-emerald-700 dark:text-emerald-300";
const SETTINGS_ICON_BUTTON_CLASS =
  "text-rose-600 hover:text-rose-700 dark:text-rose-300";
const HEADER_ICON_BUTTON_CLASS =
  "inline-flex size-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

const PANEL_TRANSITION = { duration: 0.28, ease: EASE_OUT } as const;
const RAIL_TRANSITION = { duration: 0.22, ease: EASE_OUT } as const;
const DRAFT_TAB_TRANSITION = { duration: 0.18, ease: EASE_OUT } as const;
const DRAFT_TAB_WIDTH = 440;
const REDUCED_TRANSITION = { duration: 0 } as const;

type StoredPanelState = {
  memoryCollapsed?: boolean;
  draftsCollapsed?: boolean;
  newsCollapsed?: boolean;
  settingsCollapsed?: boolean;
  chatCollapsed?: boolean;
};

const DEFAULT_PANEL_STATE = {
  memoryCollapsed: true,
  draftsCollapsed: false,
  newsCollapsed: true,
  settingsCollapsed: true,
  chatCollapsed: false,
} as const;

export function CockpitShell({
  user,
  memorySlot,
  draftsSlot,
  newsSlot,
  settingsSlot,
  chatSwitcherSlot,
  children,
}: Props) {
  const { activeDraftIds, reorderDrafts } = useActiveDrafts();
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const chatPanelRef = useRef<HTMLDivElement | null>(null);
  const [activePanel, setActivePanel] = useState<MobilePanel>("chat");
  const [memoryCollapsed, setMemoryCollapsed] = useState<boolean>(
    DEFAULT_PANEL_STATE.memoryCollapsed,
  );
  const [draftsCollapsed, setDraftsCollapsed] = useState<boolean>(
    DEFAULT_PANEL_STATE.draftsCollapsed,
  );
  const [newsCollapsed, setNewsCollapsed] = useState<boolean>(
    DEFAULT_PANEL_STATE.newsCollapsed,
  );
  const [settingsCollapsed, setSettingsCollapsed] = useState<boolean>(
    DEFAULT_PANEL_STATE.settingsCollapsed,
  );
  const [chatCollapsed, setChatCollapsed] = useState<boolean>(
    DEFAULT_PANEL_STATE.chatCollapsed,
  );
  const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null);
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(
    null,
  );
  const [chatFullyVisible, setChatFullyVisible] = useState(true);

  useEffect(() => {
    const stored = getStoredPanelState();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration sync from localStorage
    setMemoryCollapsed(stored.memoryCollapsed);
    setDraftsCollapsed(stored.draftsCollapsed);
    setNewsCollapsed(stored.newsCollapsed);
    setSettingsCollapsed(stored.settingsCollapsed);
    setChatCollapsed(stored.chatCollapsed);
  }, []);

  const hasActiveDrafts = activeDraftIds.length > 0;
  const showChatRailButton = chatCollapsed || !chatFullyVisible;
  const hasCollapsedRail =
    memoryCollapsed ||
    draftsCollapsed ||
    newsCollapsed ||
    settingsCollapsed ||
    showChatRailButton;
  const showEmptyCanvas =
    memoryCollapsed &&
    draftsCollapsed &&
    newsCollapsed &&
    settingsCollapsed &&
    chatCollapsed &&
    !hasActiveDrafts;
  const reducedMotion = useReducedMotionSafe();
  const panelTransition = reducedMotion ? REDUCED_TRANSITION : PANEL_TRANSITION;
  const railTransition = reducedMotion ? REDUCED_TRANSITION : RAIL_TRANSITION;
  const draftTabTransition = reducedMotion
    ? REDUCED_TRANSITION
    : DRAFT_TAB_TRANSITION;

  useEffect(() => {
    window.localStorage.setItem(
      PANEL_STATE_STORAGE_KEY,
      JSON.stringify({
        memoryCollapsed,
        draftsCollapsed,
        newsCollapsed,
        settingsCollapsed,
        chatCollapsed,
      }),
    );
  }, [
    chatCollapsed,
    draftsCollapsed,
    memoryCollapsed,
    newsCollapsed,
    settingsCollapsed,
  ]);

  const measureChatVisibility = useCallback(() => {
    const workspace = workspaceRef.current;
    const chatPanel = chatPanelRef.current;
    if (!workspace || !chatPanel || chatCollapsed) {
      setChatFullyVisible(true);
      return;
    }

    const workspaceRect = workspace.getBoundingClientRect();
    const chatRect = chatPanel.getBoundingClientRect();
    const tolerance = 1;
    setChatFullyVisible(
      chatRect.left >= workspaceRect.left - tolerance &&
        chatRect.right <= workspaceRect.right + tolerance,
    );
  }, [chatCollapsed]);

  useEffect(() => {
    measureChatVisibility();
  }, [
    activeDraftIds,
    chatCollapsed,
    draftsCollapsed,
    measureChatVisibility,
    memoryCollapsed,
    newsCollapsed,
    settingsCollapsed,
  ]);

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;

    let frame = 0;
    const scheduleMeasure = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measureChatVisibility);
    };

    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(workspace);
    if (chatPanelRef.current) observer.observe(chatPanelRef.current);
    workspace.addEventListener("scroll", scheduleMeasure, { passive: true });
    window.addEventListener("resize", scheduleMeasure);
    scheduleMeasure();

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      workspace.removeEventListener("scroll", scheduleMeasure);
      window.removeEventListener("resize", scheduleMeasure);
    };
  }, [measureChatVisibility]);

  const revealChatPanel = useCallback(() => {
    setChatCollapsed(false);

    const scrollChatIntoView = () => {
      chatPanelRef.current?.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "nearest",
        inline: "end",
      });
    };

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(scrollChatIntoView);
    });
  }, [reducedMotion]);

  function expandMemoryPanel() {
    setMemoryCollapsed(false);
  }
  function expandDraftsPanel() {
    setDraftsCollapsed(false);
  }
  function expandNewsPanel() {
    setNewsCollapsed(false);
  }
  function expandSettingsPanel() {
    setSettingsCollapsed(false);
  }
  function expandChatPanel() {
    revealChatPanel();
  }

  return (
    <CockpitFrame>
      <TopBar email={user.email} />

      <nav
        aria-label="Dashboard sections"
        className="grid h-11 shrink-0 grid-cols-5 border-b bg-background p-1 lg:hidden"
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
                if (panel.id === "drafts") expandDraftsPanel();
                if (panel.id === "news") expandNewsPanel();
                if (panel.id === "settings") expandSettingsPanel();
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
        <div
          ref={workspaceRef}
          onWheelCapture={handleWorkspaceWheel}
          className="min-h-0 flex-1 lg:flex lg:min-w-0 lg:flex-row lg:overflow-x-auto lg:overflow-y-hidden"
        >
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
                {settingsCollapsed ? (
                  <motion.div
                    key="settings"
                    layout
                    initial={reducedMotion ? false : { opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
                    transition={railTransition}
                  >
                    <RailButton
                      label="Expand settings"
                      icon={SettingsIcon}
                      className={SETTINGS_ICON_BUTTON_CLASS}
                      onClick={expandSettingsPanel}
                    />
                  </motion.div>
                ) : null}
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
                      onClick={expandMemoryPanel}
                    />
                  </motion.div>
                ) : null}
                {newsCollapsed ? (
                  <motion.div
                    key="news"
                    layout
                    initial={reducedMotion ? false : { opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
                    transition={railTransition}
                  >
                    <RailButton
                      label="Expand news"
                      icon={Newspaper}
                      className={NEWS_ICON_BUTTON_CLASS}
                      onClick={expandNewsPanel}
                    />
                  </motion.div>
                ) : null}
                {draftsCollapsed ? (
                  <motion.div
                    key="drafts"
                    layout
                    initial={reducedMotion ? false : { opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
                    transition={railTransition}
                  >
                    <RailButton
                      label="Expand drafts"
                      icon={FileText}
                      className={DRAFTS_ICON_BUTTON_CLASS}
                      onClick={expandDraftsPanel}
                    />
                  </motion.div>
                ) : null}
                {showChatRailButton ? (
                  <motion.div
                    key="chat"
                    layout
                    initial={reducedMotion ? false : { opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
                    transition={railTransition}
                  >
                    <RailButton
                      label={chatCollapsed ? "Expand chat" : "Show chat"}
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
              "--settings-panel-width": `${
                settingsCollapsed ? 0 : SETTINGS_PANEL_WIDTH
              }px`,
            }}
            transition={panelTransition}
            className={cn(
              "relative min-h-0 flex-1 overflow-hidden",
              activePanel === "settings" ? "flex" : "hidden",
              "lg:flex lg:h-full lg:w-[var(--settings-panel-width)] lg:flex-none lg:border-r",
              settingsCollapsed && "lg:border-r-0",
            )}
          >
            <aside
              aria-hidden={settingsCollapsed}
              inert={settingsCollapsed ? true : undefined}
              className={cn(
                "flex min-h-0 flex-1 flex-col transition-opacity duration-150 lg:w-[380px] lg:flex-none",
                settingsCollapsed && "lg:pointer-events-none lg:opacity-0",
              )}
            >
              {settingsSlot}
            </aside>

            <PanelButton
              label="Collapse settings"
              icon={ChevronLeft}
              onClick={() => setSettingsCollapsed(true)}
              className={settingsCollapsed && "lg:hidden"}
            />
          </motion.div>

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
                "flex min-h-0 flex-1 flex-col transition-opacity duration-150 lg:w-[320px] lg:flex-none",
                memoryCollapsed && "lg:pointer-events-none lg:opacity-0",
              )}
            >
              {memorySlot}
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
              "--news-panel-width": `${
                newsCollapsed ? 0 : NEWS_PANEL_WIDTH
              }px`,
            }}
            transition={panelTransition}
            className={cn(
              "relative min-h-0 flex-1 overflow-hidden",
              activePanel === "news" ? "flex" : "hidden",
              "lg:flex lg:h-full lg:w-[var(--news-panel-width)] lg:flex-none lg:border-r",
              newsCollapsed && "lg:border-r-0",
            )}
          >
            <aside
              aria-hidden={newsCollapsed}
              inert={newsCollapsed ? true : undefined}
              className={cn(
                "flex min-h-0 flex-1 flex-col transition-opacity duration-150 lg:w-[340px] lg:flex-none",
                newsCollapsed && "lg:pointer-events-none lg:opacity-0",
              )}
            >
              {newsSlot}
            </aside>

            <PanelButton
              label="Collapse news"
              icon={ChevronLeft}
              onClick={() => setNewsCollapsed(true)}
              className={newsCollapsed && "lg:hidden"}
            />
          </motion.div>

          <motion.div
            initial={false}
            animate={{
              "--drafts-panel-width": `${
                draftsCollapsed ? 0 : DRAFTS_PANEL_WIDTH
              }px`,
            }}
            transition={panelTransition}
            className={cn(
              "relative min-h-0 flex-1 overflow-hidden",
              activePanel === "drafts" ? "flex" : "hidden",
              "lg:flex lg:h-full lg:w-[var(--drafts-panel-width)] lg:flex-none lg:border-r",
              draftsCollapsed && "lg:border-r-0",
            )}
          >
            <aside
              aria-hidden={draftsCollapsed}
              inert={draftsCollapsed ? true : undefined}
              className={cn(
                "flex min-h-0 flex-1 flex-col transition-opacity duration-150 lg:w-[320px] lg:flex-none",
                draftsCollapsed && "lg:pointer-events-none lg:opacity-0",
              )}
            >
              {draftsSlot}
            </aside>

            <PanelButton
              label="Collapse drafts"
              icon={ChevronLeft}
              onClick={() => setDraftsCollapsed(true)}
              className={draftsCollapsed && "lg:hidden"}
            />
          </motion.div>

          <AnimatePresence initial={false}>
            {activeDraftIds.map((draftId, idx) => {
              const isDragging = dragSourceIndex === idx;
              const showLeftIndicator = dropIndicatorIndex === idx;
              const showRightIndicator =
                dropIndicatorIndex === idx + 1 &&
                idx === activeDraftIds.length - 1;
              return (
                <motion.div
                  key={draftId}
                  initial={reducedMotion ? false : { width: 0, opacity: 0 }}
                  animate={{
                    width: DRAFT_TAB_WIDTH,
                    opacity: isDragging ? 0.4 : 1,
                  }}
                  exit={reducedMotion ? { opacity: 0 } : { width: 0, opacity: 0 }}
                  transition={draftTabTransition}
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
                        "application/x-draft-tab",
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
                        !e.dataTransfer.types.includes("application/x-draft-tab")
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
                        "application/x-draft-tab",
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
                      reorderDrafts(from, to);
                    }}
                    className="flex h-full min-h-0 w-[440px] cursor-grab flex-col active:cursor-grabbing"
                  >
                    <aside className="flex min-h-0 flex-1 flex-col">
                      <InlineDraftEditor draftId={draftId} />
                    </aside>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          <motion.div
            ref={chatPanelRef}
            initial={false}
            animate={{
              flexGrow: chatCollapsed ? 0 : 1,
              minWidth: chatCollapsed ? 0 : 480,
              opacity: chatCollapsed ? 0 : 1,
            }}
            transition={panelTransition}
            className={cn(
              "min-h-0 overflow-hidden",
              activePanel === "chat" ? "flex" : "hidden",
              "lg:flex lg:basis-0",
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
                    setDraftsCollapsed(false);
                    setNewsCollapsed(false);
                    setSettingsCollapsed(false);
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
      draftsCollapsed:
        typeof stored.draftsCollapsed === "boolean"
          ? stored.draftsCollapsed
          : DEFAULT_PANEL_STATE.draftsCollapsed,
      newsCollapsed:
        typeof stored.newsCollapsed === "boolean"
          ? stored.newsCollapsed
          : DEFAULT_PANEL_STATE.newsCollapsed,
      settingsCollapsed:
        typeof stored.settingsCollapsed === "boolean"
          ? stored.settingsCollapsed
          : DEFAULT_PANEL_STATE.settingsCollapsed,
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

function handleWorkspaceWheel(event: WheelEvent<HTMLDivElement>) {
  if (
    event.defaultPrevented ||
    event.ctrlKey ||
    Math.abs(event.deltaX) <= Math.abs(event.deltaY)
  ) {
    return;
  }

  const workspace = event.currentTarget;
  if (
    workspace.scrollWidth <= workspace.clientWidth ||
    hasHorizontalScrollableAncestor(event.target, workspace)
  ) {
    return;
  }

  event.preventDefault();
  workspace.scrollLeft += event.deltaX;
}

function hasHorizontalScrollableAncestor(
  target: EventTarget | null,
  boundary: HTMLElement,
) {
  if (!(target instanceof HTMLElement)) return false;

  for (let node: HTMLElement | null = target; node; node = node.parentElement) {
    if (node === boundary) return false;

    const { overflowX } = window.getComputedStyle(node);
    const canScrollHorizontally =
      (overflowX === "auto" ||
        overflowX === "scroll" ||
        overflowX === "overlay") &&
      node.scrollWidth > node.clientWidth;

    if (canScrollHorizontally) return true;
  }

  return false;
}

const EMPTY_CANVAS_MESSAGES = [
  {
    title: "Lights out.",
    body: "You minimized everything. Tap a panel on the rail to bring it back.",
  },
  {
    title: "Studio's quiet.",
    body: "Every panel collapsed. Enjoy the silence or open one back up.",
  },
  {
    title: "Blank canvas.",
    body: "No panels, no chat, no drafts. You're flying clean.",
  },
] as const;

function EmptyCanvas({ onExpandAll }: { onExpandAll: () => void }) {
  const message = EMPTY_CANVAS_MESSAGES[0];
  return (
    <div className="flex max-w-sm flex-col items-center gap-3 px-6 text-center">
      <p className="text-base font-medium text-foreground">{message.title}</p>
      <p className="text-sm text-muted-foreground">{message.body}</p>
      <button
        type="button"
        onClick={onExpandAll}
        className="mt-1 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Bring it all back
      </button>
    </div>
  );
}

function RailButton({
  label,
  icon: Icon,
  className,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  className?: string;
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
