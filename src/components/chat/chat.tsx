"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  Brain,
  Check,
  ChevronDown,
  Flame,
  FileText,
  Film,
  Lightbulb,
  MessageSquare,
  Sparkles,
  Target,
  Users,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettingsDialog } from "@/components/settings/settings-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Message } from "@/components/ui/message";
import { Markdown } from "@/components/ui/markdown";
import { Loader } from "@/components/ui/loader";
import { FadeIn, Stagger, StaggerItem, StreamText } from "@/components/ui/motion";
import { DotPattern } from "@/components/ui/dot-pattern";
import { ChatInput, type ChatInputActiveVideo } from "./chat-input";
import { useActiveVideos } from "@/components/cockpit/active-videos-context";
import { ChatImage } from "./chat-image";
import { EASE_OUT, useReducedMotionSafe } from "@/lib/motion";
import { estimateCostUsd, type TokenUsage } from "@/lib/pricing";
import { PROVIDERS, providerSupportsImages, type ProviderId } from "@/lib/providers";
import type { ChatAttachment } from "./chat-input";
import { cn } from "@/lib/utils";
import { toUIMessages } from "@/lib/chat-messages";
import {
  type ProviderErrorPayload,
  decodeProviderError,
} from "@/lib/provider-errors";
import type { StarterPrompt, StarterPromptIcon, VideoStatus } from "@/lib/db/types";
import Link from "next/link";
import { cockpitSoftPanelClass } from "@/components/cockpit/cockpit-primitives";

type Props = {
  chatId: string;
  initialMessages: UIMessage[];
  initialHasMore?: boolean;
  initialStarterPrompts: StarterPrompt[];
  initialUsage: TokenUsage;
  hasActiveKey: boolean;
  activeProviderId: ProviderId;
  activeModelId: string;
};

type MessageWithUsage = UIMessage & {
  metadata?: { usage?: TokenUsage };
};

const CHAT_ROW_MOTION = {
  initial: { opacity: 0, y: 10, scale: 0.985, filter: "blur(2px)" },
  animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
  exit: { opacity: 0, y: -6, scale: 0.985, filter: "blur(2px)" },
} as const;

const CHAT_ROW_TRANSITION = {
  opacity: { duration: 0.22, ease: EASE_OUT },
  y: { duration: 0.28, ease: EASE_OUT },
  scale: { duration: 0.28, ease: EASE_OUT },
  filter: { duration: 0.2, ease: EASE_OUT },
  layout: { duration: 0.24, ease: EASE_OUT },
} as const;

const STARTER_PROMPT_ICONS: Record<StarterPromptIcon, LucideIcon> = {
  target: Target,
  lightbulb: Lightbulb,
  flame: Flame,
  users: Users,
  message: MessageSquare,
  video: Film,
  sparkles: Sparkles,
  zap: Zap,
};

type RememberState =
  | { kind: "thinking" }
  | { kind: "saving"; fact: string }
  | { kind: "saved"; fact: string }
  | { kind: "duplicate"; fact: string };

type ToolPart = {
  type: string;
  state?: string;
  input?: unknown;
  output?: unknown;
};

function readRememberPart(p: ToolPart): RememberState | null {
  const fact =
    p.input && typeof p.input === "object" && "fact" in p.input
      ? String((p.input as { fact?: unknown }).fact ?? "")
      : "";
  switch (p.state) {
    case "input-streaming":
      return { kind: "thinking" };
    case "input-available":
      return fact ? { kind: "saving", fact } : { kind: "thinking" };
    case "output-available": {
      const out = p.output as { saved?: boolean; reason?: string } | undefined;
      if (out?.saved === false && out?.reason === "duplicate") {
        return { kind: "duplicate", fact };
      }
      return { kind: "saved", fact };
    }
    default:
      return null;
  }
}

type VideoDoneData = {
  id?: string;
  title: string;
  hook?: string;
  status?: VideoStatus;
  chat_id?: string | null;
  updated_at?: string;
};

type VideoToolState =
  | { kind: "thinking"; verb: "Drafting" | "Updating" }
  | { kind: "working"; verb: "Drafting" | "Updating"; title: string }
  | { kind: "done"; verb: "Saved" | "Updated"; data: VideoDoneData }
  | { kind: "error"; verb: "Drafting" | "Updating"; title: string };

function readVideoPart(p: ToolPart): VideoToolState | null {
  const isCreate = p.type === "tool-create_video";
  const verbProgress = isCreate ? "Drafting" : "Updating";
  const verbDone = isCreate ? "Saved" : "Updated";
  const inputTitle =
    p.input && typeof p.input === "object" && "title" in p.input
      ? String((p.input as { title?: unknown }).title ?? "")
      : "";
  const inputHook =
    p.input && typeof p.input === "object" && "hook" in p.input
      ? String((p.input as { hook?: unknown }).hook ?? "")
      : "";
  switch (p.state) {
    case "input-streaming":
      return { kind: "thinking", verb: verbProgress };
    case "input-available":
      return inputTitle
        ? { kind: "working", verb: verbProgress, title: inputTitle }
        : { kind: "thinking", verb: verbProgress };
    case "output-available": {
      const out = p.output as
        | {
            error?: string;
            id?: string;
            title?: string;
            hook?: string;
            status?: VideoStatus;
            chat_id?: string | null;
            updated_at?: string;
          }
        | undefined;
      if (out?.error) {
        return { kind: "error", verb: verbProgress, title: inputTitle };
      }
      return {
        kind: "done",
        verb: verbDone,
        data: {
          id: out?.id,
          title: out?.title ?? inputTitle,
          hook: out?.hook ?? inputHook,
          status: out?.status,
          chat_id: out?.chat_id,
          updated_at: out?.updated_at,
        },
      };
    }
    default:
      return null;
  }
}

type HookToolState =
  | { kind: "thinking" }
  | { kind: "working"; preview: string }
  | { kind: "done"; preview: string }
  | { kind: "error" };

function readHookPart(p: ToolPart): HookToolState | null {
  const text =
    p.input && typeof p.input === "object" && "text" in p.input
      ? String((p.input as { text?: unknown }).text ?? "")
      : "";
  switch (p.state) {
    case "input-streaming":
      return { kind: "thinking" };
    case "input-available":
      return text
        ? { kind: "working", preview: text.slice(0, 80) }
        : { kind: "thinking" };
    case "output-available": {
      const out = p.output as { error?: string; text?: string } | undefined;
      if (out?.error) return { kind: "error" };
      const preview = (out?.text ?? text).slice(0, 80);
      return { kind: "done", preview };
    }
    default:
      return null;
  }
}

type MemoryToolState =
  | { kind: "thinking"; verb: "Reading" | "Updating" }
  | { kind: "working"; verb: "Reading" | "Updating"; path: string }
  | { kind: "done"; verb: "Read" | "Updated"; path: string }
  | { kind: "error"; verb: "Reading" | "Updating"; path: string };

function readMemoryPart(p: ToolPart): MemoryToolState | null {
  const isWrite =
    p.type === "tool-upsert_memory_file" ||
    p.type === "tool-append_memory_file";
  const verbProgress = isWrite ? "Updating" : "Reading";
  const verbDone = isWrite ? "Updated" : "Read";
  const path =
    p.input && typeof p.input === "object" && "path" in p.input
      ? String((p.input as { path?: unknown }).path ?? "")
      : "memory";

  switch (p.state) {
    case "input-streaming":
      return { kind: "thinking", verb: verbProgress };
    case "input-available":
      return { kind: "working", verb: verbProgress, path };
    case "output-available": {
      const out = p.output as { error?: string; path?: string } | undefined;
      if (out?.error) {
        return { kind: "error", verb: verbProgress, path };
      }
      return {
        kind: "done",
        verb: verbDone,
        path: out?.path ?? path,
      };
    }
    default:
      return null;
  }
}

function ChatMessageFrame({
  animateIn,
  children,
}: {
  animateIn: boolean;
  children: React.ReactNode;
}) {
  const reducedMotion = useReducedMotionSafe();

  if (reducedMotion) {
    return <div>{children}</div>;
  }

  return (
    <motion.div
      initial={animateIn ? CHAT_ROW_MOTION.initial : false}
      animate={CHAT_ROW_MOTION.animate}
      exit={CHAT_ROW_MOTION.exit}
      transition={CHAT_ROW_TRANSITION}
      className="will-change-transform"
    >
      {children}
    </motion.div>
  );
}

export function Chat({
  chatId,
  initialMessages,
  initialHasMore = false,
  initialStarterPrompts,
  initialUsage,
  hasActiveKey,
  activeProviderId,
  activeModelId,
}: Props) {
  const settingsDialog = useSettingsDialog();
  const previousStatus = useRef<string | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollSnapshotRef = useRef({
    messageCount: initialMessages.length,
    status: "ready",
    hasProviderError: false,
    hasError: false,
  });
  const [keyErrorFrom402, setKeyErrorFrom402] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [providerError, setProviderError] =
    useState<ProviderErrorPayload | null>(null);
  const missingKey = !hasActiveKey || keyErrorFrom402;

  const { activeVideoIds, closeVideo, getCached } = useActiveVideos();
  const activeVideoIdsRef = useRef(activeVideoIds);
  useEffect(() => {
    activeVideoIdsRef.current = activeVideoIds;
  }, [activeVideoIds]);

  const [videoTitles, setVideoTitles] = useState<Record<string, string | null>>(
    {},
  );

  useEffect(() => {
    if (activeVideoIds.length === 0) return;
    const missing = activeVideoIds.filter(
      (id) => !(id in videoTitles) && !getCached(id),
    );
    if (missing.length === 0) return;
    let cancelled = false;
    void Promise.all(
      missing.map(async (id) => {
        try {
          const res = await fetch(`/api/videos/${id}`);
          if (!res.ok) return [id, null] as const;
          const data = (await res.json()) as { title?: string | null };
          return [id, data.title ?? null] as const;
        } catch {
          return [id, null] as const;
        }
      }),
    ).then((entries) => {
      if (cancelled) return;
      setVideoTitles((prev) => {
        const next = { ...prev };
        for (const [id, title] of entries) next[id] = title;
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [activeVideoIds, videoTitles, getCached]);

  const activeVideos: ChatInputActiveVideo[] = useMemo(
    () =>
      activeVideoIds.map((id) => ({
        id,
        title: videoTitles[id] ?? getCached(id)?.title ?? null,
      })),
    [activeVideoIds, videoTitles, getCached],
  );

  function removeActiveVideo(videoId: string) {
    closeVideo(videoId);
  }

  const [baseMessageIds] = useState(
    () => new Set(initialMessages.map((m) => m.id)),
  );

  // Pagination state for scroll-up older message loading.
  const [olderMessages, setOlderMessages] = useState<UIMessage[]>([]);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const chat = useChat({
    id: chatId,
    messages: initialMessages,
    // eslint-disable-next-line react-hooks/refs -- ref read happens inside prepareSendMessagesRequest at send time
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ id, messages }) => ({
        body: {
          id,
          messages,
          activeVideoIds: activeVideoIdsRef.current,
        },
      }),
      fetch: async (input, init) => {
        const res = await fetch(input, init);
        if (res.status === 402) {
          setKeyErrorFrom402(true);
        } else if (res.ok) {
          setKeyErrorFrom402(false);
        }
        return res;
      },
    }),
    onError: (error) => {
      const parsed = decodeProviderError(error.message);
      if (parsed) {
        setProviderError(parsed);
      }
      // non-provider errors (network, etc.) surface generically via status
    },
    onFinish: ({ isError }) => {
      // useChat calls onFinish for errored streams too; keep those visible.
      if (!isError) {
        setProviderError(null);
      }
    },
  });
  const { messages, sendMessage, status, stop, clearError, error } = chat;

  const isStreaming = status === "submitted" || status === "streaming";

  useEffect(() => {
    previousStatus.current = status;
  }, [status]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const previous = scrollSnapshotRef.current;
    const next = {
      messageCount: messages.length,
      status,
      hasProviderError: Boolean(providerError),
      hasError: Boolean(error),
    };
    scrollSnapshotRef.current = next;

    if (stickToBottomRef.current) {
      const shouldSmoothScroll =
        previous.messageCount !== next.messageCount ||
        previous.status !== next.status ||
        previous.hasProviderError !== next.hasProviderError ||
        previous.hasError !== next.hasError;

      const frame = requestAnimationFrame(() => {
        el.scrollTo({
          top: el.scrollHeight,
          behavior: shouldSmoothScroll ? "smooth" : "auto",
        });
      });

      return () => cancelAnimationFrame(frame);
    }
  }, [messages, status, providerError, error]);

  function handleViewportScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceFromBottom < 80;
    stickToBottomRef.current = atBottom;
    setIsAtBottom(atBottom);
  }

  // Fetch older messages using the created_at of the currently-oldest message
  // as the exclusive cursor. Preserves scroll position via rAF height delta.
  type MessageWithCreatedAt = UIMessage & { metadata?: { createdAt?: string } };
  const loadOlder = useCallback(async () => {
    if (loadingOlder || !hasMore) return;
    const allCurrent: UIMessage[] = [...olderMessages, ...messages];
    const oldest = allCurrent[0] as MessageWithCreatedAt | undefined;
    const createdAt = oldest?.metadata?.createdAt;
    if (!createdAt) return;

    setLoadingOlder(true);
    const el = viewportRef.current;
    const beforeHeight = el?.scrollHeight ?? 0;
    const beforeTop = el?.scrollTop ?? 0;

    try {
      const res = await fetch(
        `/api/chats/${chatId}/messages?before=${encodeURIComponent(createdAt)}&limit=50`,
      );
      if (!res.ok) return;
      const data = (await res.json()) as {
        messages: import("@/lib/db/types").MessageRow[];
        hasMore: boolean;
      };
      const next = toUIMessages(data.messages);
      setOlderMessages((prev) => [...next, ...prev]);
      setHasMore(data.hasMore);
      // After React commits the prepended rows, push scrollTop down by the
      // height delta so the user's view anchor doesn't jump.
      requestAnimationFrame(() => {
        if (el) {
          const afterHeight = el.scrollHeight;
          el.scrollTop = beforeTop + (afterHeight - beforeHeight);
        }
      });
    } finally {
      setLoadingOlder(false);
    }
  }, [chatId, hasMore, loadingOlder, messages, olderMessages]);

  // IntersectionObserver on the sentinel div at the top of the message list.
  // Fires when it enters the viewport (user has scrolled up near the top).
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const viewport = viewportRef.current;
    if (!sentinel || !viewport || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadOlder();
        }
      },
      { root: viewport, threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadOlder]);

  const totalUsage: TokenUsage = useMemo(() => {
    const total: TokenUsage = { ...initialUsage };
    for (const raw of messages) {
      if (raw.role !== "assistant") continue;
      if (baseMessageIds.has(raw.id)) continue;
      const u = (raw as MessageWithUsage).metadata?.usage;
      if (!u) continue;
      total.inputTokens += u.inputTokens ?? 0;
      total.outputTokens += u.outputTokens ?? 0;
      total.cacheReadTokens += u.cacheReadTokens ?? 0;
      total.cacheCreationTokens += u.cacheCreationTokens ?? 0;
    }
    return total;
  }, [messages, initialUsage, baseMessageIds]);

  const totalTokens =
    totalUsage.inputTokens +
    totalUsage.outputTokens +
    totalUsage.cacheReadTokens +
    totalUsage.cacheCreationTokens;
  const estimatedCost = estimateCostUsd(
    activeProviderId,
    activeModelId,
    totalUsage,
  );

  function scrollToBottom(smooth = true) {
    const el = viewportRef.current;
    if (!el) return;
    stickToBottomRef.current = true;
    setIsAtBottom(true);
    requestAnimationFrame(() => {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    });
  }

  function handleSubmit(text: string, attachments: ChatAttachment[]) {
    setProviderError(null);
    clearError();
    scrollToBottom();
    if (attachments.length === 0) {
      sendMessage({ text });
      return;
    }
    const fileParts = attachments.map((a) => ({
      type: "file" as const,
      url: a.url,
      mediaType: a.mediaType,
      filename: a.filename,
    }));
    const parts = text
      ? [...fileParts, { type: "text" as const, text }]
      : fileParts;
    sendMessage({ parts });
  }

  const last = messages[messages.length - 1];
  const lastIsUserAfterSubmit = status === "submitted" && last?.role === "user";
  const lastAssistantHasNothingVisible =
    status === "streaming" &&
    last?.role === "assistant" &&
    !last.parts.some(
      (p) =>
        (p.type === "text" && p.text.length > 0) ||
        (p.type === "reasoning" &&
          typeof (p as { text?: string }).text === "string" &&
          (p as { text: string }).text.length > 0) ||
        p.type.startsWith("tool-"),
    );
  const showThinking = lastIsUserAfterSubmit || lastAssistantHasNothingVisible;
  const genericError =
    !providerError && status === "error" && error
      ? readGenericErrorMessage(error)
      : null;
  const notice =
    missingKey
      ? {
          id: "missing-key",
          message: `Add your ${PROVIDERS[activeProviderId].label} API key in settings to start chatting.`,
          actions: [
            {
              label: "Edit settings",
              onClick: () => settingsDialog.open(),
            },
          ],
        }
      : providerError
        ? providerErrorToNotice(providerError, {
            onOpenSettings: () => settingsDialog.open(),
            onDismiss: () => {
              setProviderError(null);
              clearError();
            },
          })
        : genericError
          ? {
              id: "chat-error",
              message: genericError,
              onDismiss: () => clearError(),
            }
          : null;

  return (
    <div className="relative flex h-full flex-col">
      <ScrollArea
        className="flex-1 min-h-0"
        viewportRef={viewportRef}
        onViewportScroll={handleViewportScroll}
      >
        <div
          className={cn(
            "flex min-h-full w-full flex-col gap-4 px-4 py-5",
            messages.length === 0 && "justify-center",
          )}
          role="log"
        >
          {messages.length === 0 ? (
            <EmptyState
              prompts={initialStarterPrompts}
              onPick={(text) => handleSubmit(text, [])}
            />
          ) : (
            <>
              <AnimatePresence initial={false}>
                {messages.map((m, i) => {
                  const isLast = i === messages.length - 1;
                  const streamingThis =
                    isLast && m.role === "assistant" && status === "streaming";

                  return (
                    <ChatMessageFrame
                      key={m.id}
                      animateIn={!baseMessageIds.has(m.id)}
                    >
                      <MessageRender
                        message={m}
                        streamingThis={streamingThis}
                      />
                    </ChatMessageFrame>
                  );
                })}
              </AnimatePresence>

              <AnimatePresence initial={false}>
                {showThinking && (
                  <motion.div
                    layout
                    key="thinking"
                    initial={CHAT_ROW_MOTION.initial}
                    animate={CHAT_ROW_MOTION.animate}
                    exit={CHAT_ROW_MOTION.exit}
                    transition={CHAT_ROW_TRANSITION}
                    aria-live="polite"
                    aria-label="Assistant is thinking"
                  >
                    <div className="flex items-center gap-2 px-1 py-1.5">
                      <Sparkles className="size-3.5 animate-pulse text-primary" />
                      <Loader
                        variant="text-shimmer"
                        size="sm"
                        text="Thinking"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </>
          )}
        </div>
      </ScrollArea>

      <div className="relative shrink-0">
        <AnimatePresence initial={false}>
          {!isAtBottom && messages.length > 0 && (
            <motion.button
              key="scroll-down"
              type="button"
              onClick={() => scrollToBottom(true)}
              initial={{ opacity: 0, y: 6, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.9 }}
              transition={{ duration: 0.18, ease: EASE_OUT }}
              aria-label="Scroll to latest"
              className="absolute left-1/2 -top-10 -translate-x-1/2 z-20 inline-flex size-8 items-center justify-center rounded-full border border-border bg-background shadow-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <ArrowDown className="size-4" />
            </motion.button>
          )}
        </AnimatePresence>
        <div className="w-full px-4 pb-3">
          <AnimatePresence initial={false}>
            {notice && (
              <motion.div
                key={notice.id}
                initial={CHAT_ROW_MOTION.initial}
                animate={CHAT_ROW_MOTION.animate}
                exit={CHAT_ROW_MOTION.exit}
                transition={CHAT_ROW_TRANSITION}
              >
                <ChatNotice {...notice} />
              </motion.div>
            )}
          </AnimatePresence>
          <ChatInput
            onSubmit={handleSubmit}
            disabled={missingKey}
            isStreaming={isStreaming}
            onStop={() => stop()}
            autoFocus
            attachmentsDisabled={!providerSupportsImages(activeProviderId)}
            attachmentsDisabledReason={`${PROVIDERS[activeProviderId].label} doesn't support image input. Switch provider in settings.`}
            activeVideos={activeVideos}
            onRemoveActiveVideo={removeActiveVideo}
          />
          {totalTokens > 0 && (
            <div
              className="mt-1.5 text-center text-[10px] tracking-wide text-muted-foreground/70"
              title={buildUsageTitle(totalUsage, estimatedCost)}
            >
              {formatTokens(totalTokens)}
              {estimatedCost !== null && (
                <span> tokens • {formatUsd(estimatedCost)}</span>
              )}
              {estimatedCost === null && <span> tokens</span>}
              <span> this chat</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTokens(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}K`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}

function formatUsd(n: number): string {
  if (n > 0 && n < 0.01) return "<$0.01";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function buildUsageTitle(usage: TokenUsage, estimatedCost: number | null) {
  const parts = [
    `${usage.inputTokens.toLocaleString()} input`,
    `${usage.outputTokens.toLocaleString()} output`,
  ];
  if (usage.cacheReadTokens > 0) {
    parts.push(`${usage.cacheReadTokens.toLocaleString()} cache read`);
  }
  if (usage.cacheCreationTokens > 0) {
    parts.push(`${usage.cacheCreationTokens.toLocaleString()} cache write`);
  }
  if (estimatedCost !== null) {
    parts.push(`${formatUsd(estimatedCost)} estimated`);
  }
  return parts.join(" + ");
}

function readGenericErrorMessage(error: Error): string {
  const parsed = decodeProviderError(error.message);
  if (parsed) return parsed.message;
  return "Something went wrong while generating a response. Try again.";
}

type ChatNoticeAction = {
  label: string;
  href?: string;
  onClick?: () => void;
};

type ChatNoticeProps = {
  id: string;
  message: string;
  actions?: ChatNoticeAction[];
  onDismiss?: () => void;
};

function providerErrorToNotice(
  payload: ProviderErrorPayload,
  {
    onOpenSettings,
    onDismiss,
  }: {
    onOpenSettings: () => void;
    onDismiss: () => void;
  },
): ChatNoticeProps {
  const opensSettings = payload.helpUrl === "/settings";
  const actions: ChatNoticeAction[] = [];

  if (payload.code === "org_unverified" && payload.helpUrl) {
    actions.push({ label: "Verify org", href: payload.helpUrl });
    actions.push({ label: "Switch model", onClick: onOpenSettings });
  } else if (payload.code === "model_unavailable") {
    actions.push({ label: "Switch model", onClick: onOpenSettings });
  } else if (opensSettings || payload.code === "invalid_key") {
    actions.push({ label: "Edit settings", onClick: onOpenSettings });
  } else if (payload.helpUrl) {
    actions.push({ label: "Open", href: payload.helpUrl });
  }

  return {
    id: `provider-error-${payload.code}`,
    message: payload.message,
    actions,
    onDismiss,
  };
}

function ChatNotice({
  message,
  actions = [],
  onDismiss,
}: ChatNoticeProps) {

  return (
    <div
      role="alert"
      className="mx-auto mb-3 flex w-[min(100%,58rem)] items-start gap-4 rounded-[1.75rem] border border-destructive/25 bg-destructive/10 px-5 py-4 text-sm leading-relaxed text-destructive shadow-sm md:px-6 md:text-base dark:text-red-300"
    >
      <AlertTriangle className="mt-0.5 size-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="break-words">{message}</p>
        {actions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {actions.map((action) => (
              <NoticeAction key={action.label} action={action} />
            ))}
          </div>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss warning"
          className="-mr-1 shrink-0 rounded-lg p-1 opacity-70 hover:bg-destructive/10 hover:opacity-100"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

function NoticeAction({ action }: { action: ChatNoticeAction }) {
  const className =
    "inline-flex items-center gap-1.5 rounded-lg border border-destructive/25 px-2.5 py-1 text-xs font-medium hover:bg-destructive/10 md:text-sm";

  if (action.href) {
    const isExternal = action.href.startsWith("http");
    return (
      <a
        href={action.href}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        className={className}
      >
        {action.label}
        <ArrowRight className="size-3.5" />
      </a>
    );
  }

  return (
    <button type="button" onClick={action.onClick} className={className}>
      {action.label}
      <ArrowRight className="size-3.5" />
    </button>
  );
}

function EmptyState({
  prompts,
  onPick,
}: {
  prompts: StarterPrompt[];
  onPick: (text: string) => void;
}) {
  return (
    <FadeIn className="relative mx-auto flex min-h-[min(680px,100%)] w-full max-w-[1040px] items-center justify-center overflow-hidden px-4 py-8 text-center md:px-6 md:py-12">
      <DotPattern
        width={22}
        height={22}
        cx={1}
        cy={1}
        cr={1}
        glow
        className="text-primary/18 [mask-image:radial-gradient(ellipse_65%_58%_at_center,black_8%,black_38%,transparent_74%)]"
      />
      <div className="absolute inset-x-8 top-1/2 h-[420px] -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,var(--primary),transparent_66%)] opacity-[0.08] blur-2xl" />
      <div className="relative flex w-full max-w-[780px] flex-col items-center gap-7">
        <div className="flex max-w-xl flex-col items-center gap-2.5">
          <div className="mb-1 flex size-10 items-center justify-center rounded-lg border bg-background/95 text-primary shadow-sm">
            <Sparkles className="size-5" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight md:text-[1.7rem]">
            What do you want to make?
          </h2>
          <p className="max-w-lg text-sm leading-6 text-muted-foreground md:text-[0.95rem]">
            Tell me your goal, niche, or what you&apos;re stuck on. I&apos;ll
            pick a specific short-form video and walk you through it.
          </p>
        </div>
        <Stagger className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2">
          {prompts.map((prompt, index) => {
            const Icon = STARTER_PROMPT_ICONS[prompt.icon] ?? Sparkles;

            return (
              <StaggerItem key={`${prompt.icon}-${prompt.text}-${index}`}>
                <Button
                  variant="outline"
                  shape="card"
                  onClick={() => onPick(prompt.text)}
                  className="group min-h-[82px] w-full rounded-lg border-border/80 bg-background/90 px-4 py-3.5 text-left text-[0.93rem] leading-snug text-muted-foreground shadow-sm shadow-black/[0.02] transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:bg-background hover:text-foreground hover:shadow-md"
                >
                  <span className="flex w-full items-start gap-3">
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted/45 text-muted-foreground transition-colors group-hover/button:border-primary/25 group-hover/button:bg-primary/10 group-hover/button:text-primary">
                      <Icon className="size-3.5" />
                    </span>
                    <span className="min-w-0 whitespace-normal">
                      {prompt.text}
                    </span>
                  </span>
                </Button>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </FadeIn>
  );
}

type Segment =
  | { kind: "text"; text: string; state?: "streaming" | "done" }
  | { kind: "reasoning"; text: string; state?: "streaming" | "done" }
  | { kind: "remember"; state: RememberState }
  | { kind: "memory"; state: MemoryToolState }
  | { kind: "video"; state: VideoToolState }
  | { kind: "hook"; state: HookToolState };

function buildSegments(message: UIMessage): Segment[] {
  const out: Segment[] = [];
  for (const raw of message.parts) {
    const p = raw as ToolPart & { text?: string };
    if (p.type === "text") {
      const text = typeof p.text === "string" ? p.text : "";
      if (!text) continue;
      const last = out[out.length - 1];
      if (last && last.kind === "text") {
        last.text += text;
        last.state = (p.state as "streaming" | "done") ?? last.state;
      } else {
        out.push({
          kind: "text",
          text,
          state: p.state as "streaming" | "done" | undefined,
        });
      }
      continue;
    }
    if (p.type === "reasoning") {
      const text = typeof p.text === "string" ? p.text : "";
      const last = out[out.length - 1];
      if (last && last.kind === "reasoning") {
        last.text += text;
        last.state = (p.state as "streaming" | "done") ?? last.state;
      } else {
        out.push({
          kind: "reasoning",
          text,
          state: p.state as "streaming" | "done" | undefined,
        });
      }
      continue;
    }
    if (p.type === "tool-remember_user_fact") {
      const s = readRememberPart(p);
      if (s) out.push({ kind: "remember", state: s });
      continue;
    }
    if (
      p.type === "tool-list_memory_files" ||
      p.type === "tool-read_memory_file" ||
      p.type === "tool-upsert_memory_file" ||
      p.type === "tool-append_memory_file"
    ) {
      const s = readMemoryPart(p);
      if (s) out.push({ kind: "memory", state: s });
      continue;
    }
    if (p.type === "tool-create_video" || p.type === "tool-update_video") {
      const s = readVideoPart(p);
      if (s) out.push({ kind: "video", state: s });
      continue;
    }
    if (p.type === "tool-save_hook") {
      const s = readHookPart(p);
      if (s) out.push({ kind: "hook", state: s });
      continue;
    }
  }
  return out;
}

function MessageRender({
  message,
  streamingThis,
}: {
  message: UIMessage;
  streamingThis: boolean;
}) {
  const isUser = message.role === "user";

  if (isUser) {
    const text = message.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("");
    const files = message.parts.filter(
      (p): p is { type: "file"; url: string; mediaType: string; filename?: string } =>
        p.type === "file" &&
        typeof (p as { url?: unknown }).url === "string" &&
        typeof (p as { mediaType?: unknown }).mediaType === "string" &&
        (p as { mediaType: string }).mediaType.startsWith("image/"),
    );
    if (!text && files.length === 0) return null;
    return (
      <Message className="w-full justify-end">
        <div className="flex max-w-[80%] flex-col items-end gap-1.5">
          {files.length > 0 && (
            <div className="flex flex-wrap justify-end gap-1.5">
              {files.map((f, i) => (
                <ChatImage
                  key={`${f.url}-${i}`}
                  url={f.url}
                  alt={f.filename ?? "Attachment"}
                  className="size-32"
                />
              ))}
            </div>
          )}
          {text && (
            <div className="whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-3 py-2 text-[15px] leading-relaxed text-primary-foreground break-words">
              {text}
            </div>
          )}
        </div>
      </Message>
    );
  }

  const segments = buildSegments(message);
  if (segments.length === 0) return null;

  const lastTextIdx = (() => {
    for (let i = segments.length - 1; i >= 0; i--) {
      if (segments[i].kind === "text") return i;
    }
    return -1;
  })();

  return (
    <Message className="w-full justify-start">
      <div className="flex max-w-[80%] flex-col gap-2">
        {segments.map((seg, si) => {
          if (seg.kind === "text") {
            return (
              <div
                key={si}
                className="rounded-2xl rounded-bl-md bg-muted/60 px-3 py-2 text-[15px] leading-relaxed text-foreground break-words prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-headings:text-foreground prose-headings:my-3 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-pre:my-2 first:[&>*]:mt-0 last:[&>*]:mb-0"
              >
                <StreamText
                  text={seg.text}
                  isStreaming={streamingThis && si === lastTextIdx}
                  renderStable={(t) => <Markdown>{t}</Markdown>}
                />
              </div>
            );
          }
          if (seg.kind === "reasoning") {
            return (
              <ReasoningBlock key={si} text={seg.text} state={seg.state} />
            );
          }
          if (seg.kind === "remember") {
            return <RememberChip key={si} state={seg.state} />;
          }
          if (seg.kind === "memory") {
            return <MemoryChip key={si} state={seg.state} />;
          }
          if (seg.kind === "hook") {
            return <HookChip key={si} state={seg.state} />;
          }
          if (seg.kind === "video" && seg.state.kind === "done") {
            return <VideoEmbedCard key={si} state={seg.state} />;
          }
          return <VideoChip key={si} state={seg.state} />;
        })}
      </div>
    </Message>
  );
}

function ReasoningBlock({
  text,
  state,
}: {
  text: string;
  state?: "streaming" | "done";
}) {
  const [open, setOpen] = useState(false);
  const streaming = state === "streaming";
  return (
    <div className="text-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Brain
          className={cn("size-3.5", streaming && "animate-pulse text-primary")}
        />
        <span className="font-medium">
          {streaming ? "Thinking..." : "Thought"}
        </span>
        <ChevronDown
          className={cn(
            "size-3 transition-transform opacity-60",
            open && "rotate-180",
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && text && (
          <motion.div
            key="reasoning-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
            style={{ overflow: "hidden" }}
          >
            <div className="mt-1.5 whitespace-pre-wrap border-l-2 border-border/60 pl-3 text-muted-foreground/90">
              {text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function VideoChip({ state }: { state: VideoToolState }) {
  const err = state.kind === "error";
  const label =
    state.kind === "thinking"
      ? `${state.verb} video...`
      : state.kind === "working"
        ? `${state.verb}: ${state.title}`
        : state.kind === "error"
          ? `Couldn't save: ${state.title}`
          : `${state.verb} video`;
  return (
    <div
      className={cn(
        "inline-flex w-fit items-center gap-1.5 text-xs",
        err ? "text-destructive" : "text-muted-foreground",
      )}
    >
      <Film className={cn("size-3.5", !err && "animate-pulse text-primary")} />
      <span className="break-words">{label}</span>
    </div>
  );
}

const VIDEO_STATUS_META: Record<
  VideoStatus,
  { label: string; chip: string }
> = {
  idea: {
    label: "Idea",
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  },
  ready: {
    label: "Ready to film",
    chip: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
  },
  filmed: {
    label: "Filmed",
    chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  },
};

function VideoEmbedCard({
  state,
}: {
  state: Extract<VideoToolState, { kind: "done" }>;
}) {
  const { data, verb } = state;
  const status = data.status ?? "idea";
  const meta = VIDEO_STATUS_META[status];
  const href = data.id ? `/dashboard/videos/${data.id}` : null;

  const body = (
    <>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            meta.chip,
          )}
        >
          {meta.label}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-medium text-muted-foreground">
          <Check className="size-3 text-emerald-500" />
          {verb}
        </span>
      </div>
      <p className="mt-1.5 line-clamp-2 text-[13px] font-semibold leading-5 text-foreground">
        {data.title || "Untitled video"}
      </p>
      {data.hook && (
        <p className="mt-1 line-clamp-3 break-words text-xs leading-5 text-muted-foreground">
          {data.hook}
        </p>
      )}
      {href && (
        <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-primary opacity-80 group-hover:opacity-100">
          Open editor
          <ArrowRight className="size-3" />
        </span>
      )}
    </>
  );

  const className = cn(
    "group block w-full max-w-sm p-3 transition-colors hover:bg-muted/50",
    cockpitSoftPanelClass,
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: EASE_OUT }}
    >
      {href ? (
        <Link href={href} className={className}>
          {body}
        </Link>
      ) : (
        <div className={className}>{body}</div>
      )}
    </motion.div>
  );
}

function HookChip({ state }: { state: HookToolState }) {
  const done = state.kind === "done";
  const err = state.kind === "error";
  const label =
    state.kind === "thinking"
      ? "Saving hook..."
      : state.kind === "working"
        ? `Saving hook: ${state.preview}`
        : state.kind === "error"
          ? "Couldn't save hook"
          : `Saved hook: ${state.preview}`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 2 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: EASE_OUT }}
      className={cn(
        "inline-flex w-fit items-center gap-1.5 text-xs",
        err ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {done ? (
        <Check className="size-3.5 text-emerald-500" />
      ) : (
        <Sparkles
          className={cn("size-3.5", !err && "animate-pulse text-primary")}
        />
      )}
      <span className="break-words">{label}</span>
    </motion.div>
  );
}

function MemoryChip({ state }: { state: MemoryToolState }) {
  const done = state.kind === "done";
  const err = state.kind === "error";
  const label =
    state.kind === "thinking"
      ? `${state.verb} memory...`
      : state.kind === "working"
        ? `${state.verb}: ${state.path}`
        : state.kind === "error"
          ? `Memory failed: ${state.path}`
          : `${state.verb}: ${state.path}`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 2 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: EASE_OUT }}
      className={cn(
        "inline-flex w-fit items-center gap-1.5 text-xs",
        err ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {done ? (
        <Check className="size-3.5 text-emerald-500" />
      ) : (
        <FileText
          className={cn("size-3.5", !err && "animate-pulse text-primary")}
        />
      )}
      <span className="break-words">{label}</span>
    </motion.div>
  );
}

function RememberChip({ state }: { state: RememberState }) {
  const done = state.kind === "saved" || state.kind === "duplicate";
  const label =
    state.kind === "thinking"
      ? "Noting something about you..."
      : state.kind === "saving"
        ? `Remembering: ${state.fact}`
        : state.kind === "duplicate"
          ? `Already knew: ${state.fact}`
          : `Remembered: ${state.fact}`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 2 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: EASE_OUT }}
      className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground"
    >
      {done ? (
        <Check className="size-3.5 text-emerald-500" />
      ) : (
        <Brain className="size-3.5 animate-pulse text-primary" />
      )}
      <span className="break-words">{label}</span>
    </motion.div>
  );
}
