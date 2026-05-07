"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowDown, Brain, DollarSign, Sparkles, X } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { ChatInput, type ChatAttachment } from "./chat-input";
import { ChatImage } from "./chat-image";
import {
  NewsSignalCard,
  type NewsSignalCardData,
} from "@/components/news/news-signal-card";
import {
  UserCitationCard,
  extractSignalIds,
} from "@/components/news/user-citation-card";
import {
  UserDraftCard,
  extractDraftIds,
} from "@/components/drafts/user-draft-card";
import {
  EmbeddedDraftCard,
  type EmbeddedDraftData,
} from "@/components/drafts/draft-card";
import { citeSignal } from "@/lib/cite-signal";
import { Loader } from "@/components/ui/loader";
import { Markdown } from "@/components/ui/markdown";
import { Message } from "@/components/ui/message";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EASE_OUT } from "@/lib/motion";
import { estimateCostUsd, type TokenUsage } from "@/lib/pricing";
import { PROVIDERS, providerSupportsImages, type ProviderId } from "@/lib/providers";
import {
  decodeProviderError,
  type ProviderErrorPayload,
} from "@/lib/provider-errors";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { DraftRow } from "@/lib/db/types";

type Props = {
  chatId: string;
  draftId?: string;
  initialMessages: UIMessage[];
  initialHasMore?: boolean;
  initialUsage: TokenUsage;
  hasActiveKey: boolean;
  activeProviderId: ProviderId;
  activeModelId: string;
};

type MessageWithUsage = UIMessage & {
  metadata?: { usage?: TokenUsage; createdAt?: string };
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

export function Chat({
  chatId,
  draftId,
  initialMessages,
  initialHasMore = false,
  initialUsage,
  hasActiveKey,
  activeProviderId,
  activeModelId,
}: Props) {
  const router = useRouter();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [keyErrorFrom402, setKeyErrorFrom402] = useState(false);
  const [providerError, setProviderError] =
    useState<ProviderErrorPayload | null>(null);
  const [baseMessageIds] = useState(
    () => new Set(initialMessages.map((m) => m.id)),
  );
  const [optimisticModelId, setOptimisticModelId] = useState<string | null>(
    null,
  );
  const [propModelSnapshot, setPropModelSnapshot] = useState(activeModelId);
  if (propModelSnapshot !== activeModelId) {
    setPropModelSnapshot(activeModelId);
    setOptimisticModelId(null);
  }
  const selectedModelId = optimisticModelId ?? activeModelId;

  function handleModelChange(nextModelId: string) {
    if (nextModelId === selectedModelId) return;
    setOptimisticModelId(nextModelId);
    fetch("/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        active_provider_id: activeProviderId,
        active_model_id: nextModelId,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`profile_patch_failed_${res.status}`);
        router.refresh();
      })
      .catch(() => {
        setOptimisticModelId(null);
      });
  }

  const chat = useChat({
    id: chatId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ id, messages }) => ({
        body: draftId
          ? { id, messages, activeDraftId: draftId }
          : { id, messages },
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
      if (parsed) setProviderError(parsed);
    },
    onFinish: ({ isError }) => {
      if (!isError) {
        setProviderError(null);
        router.refresh();
      }
    },
  });

  const { messages, sendMessage, status, stop, clearError, error } = chat;
  const isStreaming = status === "submitted" || status === "streaming";
  const missingKey = !hasActiveKey || keyErrorFrom402;

  const seenMemorySavesRef = useRef<Set<string>>(new Set());
  const seenDraftSavesRef = useRef<Set<string>>(new Set());
  const seenStreamingEndsRef = useRef<Set<string>>(new Set());
  const lastStreamingBodyRef = useRef<Map<string, string>>(new Map());
  useEffect(() => {
    for (const m of messages) {
      if (m.role !== "assistant") continue;
      for (const part of m.parts) {
        const p = part as {
          type: string;
          toolCallId?: string;
          state?: string;
          input?: { body?: unknown; id?: unknown };
          output?: { ok?: boolean; id?: string; draft?: DraftRow };
        };
        if (!p.toolCallId) continue;

        const isDraftSave = p.type === "tool-save_as_draft";
        const isDraftUpdate = p.type === "tool-update_draft";
        const isDraftTool = isDraftSave || isDraftUpdate;

        // Streaming tool-arg updates: surface partial body live.
        if (
          isDraftTool &&
          p.state === "input-streaming" &&
          typeof p.input?.body === "string"
        ) {
          const partialBody = p.input.body;
          const prev = lastStreamingBodyRef.current.get(p.toolCallId);
          if (prev === partialBody) continue;
          lastStreamingBodyRef.current.set(p.toolCallId, partialBody);
          const kind = isDraftSave ? "save" : "update";
          const targetId = isDraftUpdate
            ? typeof p.input?.id === "string"
              ? p.input.id
              : draftId
            : undefined;
          window.dispatchEvent(
            new CustomEvent("linkedin-studio:draft:streaming", {
              detail: {
                kind,
                id: targetId,
                body: partialBody,
                toolCallId: p.toolCallId,
              },
            }),
          );
          continue;
        }

        if (p.state !== "output-available") continue;
        if (p.output?.ok !== true) continue;

        if (
          p.type === "tool-write_memory" ||
          p.type === "tool-update_memory"
        ) {
          if (seenMemorySavesRef.current.has(p.toolCallId)) continue;
          seenMemorySavesRef.current.add(p.toolCallId);
          window.dispatchEvent(new CustomEvent("memory:saved"));
        } else if (isDraftTool) {
          // streaming-end fires once per toolCallId regardless of drafts:changed dedupe.
          if (!seenStreamingEndsRef.current.has(p.toolCallId)) {
            seenStreamingEndsRef.current.add(p.toolCallId);
            const kind = isDraftSave ? "save" : "update";
            const finalId =
              p.output?.id ??
              (isDraftUpdate
                ? typeof p.input?.id === "string"
                  ? p.input.id
                  : draftId
                : undefined);
            if (p.output.draft) {
              window.dispatchEvent(
                new CustomEvent("linkedin-studio:draft", {
                  detail: { type: "updated", draft: p.output.draft },
                }),
              );
            }
            window.dispatchEvent(
              new CustomEvent("linkedin-studio:draft:streaming-end", {
                detail: {
                  kind,
                  id: finalId,
                  draft: p.output.draft,
                  toolCallId: p.toolCallId,
                },
              }),
            );
          }
          if (seenDraftSavesRef.current.has(p.toolCallId)) continue;
          seenDraftSavesRef.current.add(p.toolCallId);
          window.dispatchEvent(
            new CustomEvent("linkedin-studio:drafts:changed", {
              detail: { id: p.output?.id ?? null },
            }),
          );
        }
      }
    }
  }, [messages, draftId]);

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
    selectedModelId,
    totalUsage,
  );
  const providerModels = PROVIDERS[activeProviderId].models;
  const activeModelLabel =
    providerModels.find((m) => m.id === selectedModelId)?.label ??
    selectedModelId;

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

  function handleViewportScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceFromBottom < 80;
    stickToBottomRef.current = atBottom;
    setIsAtBottom(atBottom);
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
      path: a.path,
      mediaType: a.mediaType,
      filename: a.filename,
    }));
    const parts = text
      ? [...fileParts, { type: "text" as const, text }]
      : fileParts;
    sendMessage({ parts });
  }

  const last = messages[messages.length - 1];
  const showThinking =
    status === "submitted" ||
    (status === "streaming" &&
      last?.role === "assistant" &&
      !last.parts.some(
        (p) =>
          (p.type === "text" && p.text.length > 0) ||
          (p.type === "reasoning" &&
            typeof (p as { text?: string }).text === "string" &&
            (p as { text: string }).text.length > 0),
      ));
  const genericError =
    !providerError && status === "error" && error
      ? readGenericErrorMessage(error)
      : null;
  const notice =
    missingKey
      ? {
          id: "missing-key",
          message: `${PROVIDERS[activeProviderId].label} API key not configured on the server.`,
        }
      : providerError
        ? providerErrorToNotice(providerError, {
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
      <div className="relative min-h-0 flex-1">
      <ScrollArea
        className="h-full"
        viewportClassName="!overflow-x-hidden"
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
              onPick={(text) => handleSubmit(text, [])}
              variant={draftId ? "draft" : "general"}
            />
          ) : (
            <>
              {initialHasMore && (
                <p className="text-center text-xs text-muted-foreground">
                  Older messages load in the archive view.
                </p>
              )}
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
                    layout="position"
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
                      <Loader variant="text-shimmer" size="sm" text="Thinking" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </ScrollArea>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-background to-transparent"
        />
      </div>

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
              className="absolute left-1/2 top-[-2.5rem] z-20 inline-flex size-8 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-md transition-colors duration-200 ease-out hover:bg-muted hover:text-foreground"
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
            attachmentsDisabledReason={`${PROVIDERS[activeProviderId].label} does not support image input.`}
          />
          <div
            className="mt-1.5 flex items-center justify-center gap-1 text-[10px] tracking-wide text-muted-foreground/70"
            title={buildUsageTitle(totalUsage, estimatedCost)}
          >
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Change model"
                className="rounded transition-colors duration-200 ease-out outline-none hover:bg-muted/40 hover:text-foreground focus-visible:text-foreground focus-visible:ring-1 focus-visible:ring-ring/50"
              >
                {activeModelLabel}
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="center"
                side="top"
                sideOffset={6}
                className="w-auto min-w-64"
              >
                <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-2 pt-1 pb-1.5 pr-9 text-[10px] uppercase tracking-wide text-muted-foreground/70">
                  <span>Model</span>
                  <span className="w-12 text-center">cost</span>
                  <span className="w-12 text-center">iq</span>
                </div>
                <DropdownMenuRadioGroup
                  value={selectedModelId}
                  onValueChange={(value) => handleModelChange(String(value))}
                >
                  {providerModels.map((m) => (
                    <DropdownMenuRadioItem
                      key={m.id}
                      value={m.id}
                      className="pr-9"
                    >
                      <span className="grid w-full grid-cols-[1fr_auto_auto] items-center gap-4 whitespace-nowrap">
                        <span>{m.label}</span>
                        <span className="flex w-12 justify-center text-muted-foreground">
                          <TierIcons
                            icon={DollarSign}
                            level={m.cost}
                            label="cost"
                          />
                        </span>
                        <span className="flex w-12 justify-center text-muted-foreground">
                          <TierIcons
                            icon={Brain}
                            level={m.intelligence}
                            label="intelligence"
                          />
                        </span>
                      </span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            {totalTokens > 0 && (
              <span>
                · {formatTokens(totalTokens)}
                {estimatedCost !== null && (
                  <> tokens / {formatUsd(estimatedCost)}</>
                )}
                {estimatedCost === null && <> tokens</>}
                {" "}this chat
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TierIcons({
  icon: Icon,
  level,
  label,
}: {
  icon: typeof DollarSign;
  level: number;
  label: string;
}) {
  const max = 3;
  const safeLevel = Math.max(1, Math.min(max, level));
  return (
    <span
      className="flex items-center gap-0.5"
      aria-label={`${label}: ${safeLevel} of ${max}`}
    >
      {Array.from({ length: max }).map((_, i) => (
        <Icon
          key={i}
          className={cn(
            "size-3",
            i < safeLevel
              ? "!text-foreground/80"
              : "!text-muted-foreground/30",
          )}
          aria-hidden
        />
      ))}
    </span>
  );
}

function EmptyState({
  onPick,
  variant,
}: {
  onPick: (text: string) => void;
  variant: "draft" | "general";
}) {
  const prompts =
    variant === "draft"
      ? [
          "Make this draft punchier",
          "Shorten the intro and keep the hook",
          "Read the source signal and tighten the argument",
        ]
      : [
          "Scan the news for my niche",
          "Draft a LinkedIn post about today's top signal",
          "Remember that my niche is...",
        ];

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 text-center">
      <div className="grid size-11 place-items-center rounded-xl bg-[#0A66C2]/10 text-[#0A66C2]">
        {variant === "draft" ? <Sparkles className="size-5" /> : <LogoMark className="size-5" />}
      </div>
      <div>
        <h1 className="text-lg font-semibold">
          {variant === "draft" ? "Draft assistant" : "LinkedIn Studio"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {variant === "draft"
            ? "Edit this draft in your voice."
            : "Talk to your ghostwriter. Scan news, save memories, draft posts."}
        </p>
      </div>
      <div className="grid w-full gap-2">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onPick(prompt)}
            className="rounded-lg border bg-background px-3 py-2 text-left text-sm transition-colors duration-200 ease-out hover:bg-muted/60"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageRender({
  message,
}: {
  message: UIMessage;
  streamingThis?: boolean;
}) {
  const isUser = message.role === "user";

  const renderToolChip = (
    type: string,
    key: number,
  ): React.ReactNode | null => {
    const labels: Record<string, string> = {
      "tool-read_signal": "Read signal",
      "tool-read_memory": "Read memory",
      "tool-write_memory": "Saved to memory",
      "tool-update_memory": "Updated memory",
      "tool-news_scan": "Scanned news",
      "tool-list_sources": "Listed feeds",
      "tool-add_source": "Added feed",
      "tool-remove_source": "Removed feed",
      "tool-update_source": "Updated feed",
      "tool-list_niche_bundles": "Browsed bundles",
      "tool-add_niche_bundle": "Added bundle",
    };
    const label = labels[type];
    return label ? <ToolChip key={key} label={label} /> : null;
  };

  const collectNewsCards = (
    parts: UIMessage["parts"],
  ): NewsSignalCardData[] => {
    const out: NewsSignalCardData[] = [];
    for (const part of parts) {
      if (part.type !== "tool-news_scan") continue;
      const p = part as {
        state?: string;
        output?: {
          ok?: boolean;
          signals?: Array<{
            id: string;
            source: string | null;
            text: string;
            url: string;
            posted_at: string;
            summary: string | null;
            relevance_score: number | null;
          }>;
        };
      };
      if (p.state !== "output-available" || !p.output?.ok) continue;
      for (const s of p.output.signals ?? []) {
        out.push({
          id: s.id,
          source: s.source,
          posted_at: s.posted_at,
          text: s.summary?.trim() || s.text || s.url,
          url: s.url,
          relevance_score: s.relevance_score,
        });
      }
    }
    return out;
  };

  const newsScanPending = (parts: UIMessage["parts"]): boolean =>
    parts.some(
      (part) =>
        part.type === "tool-news_scan" &&
        (part as { state?: string }).state !== "output-available",
    );

  const collectDraftIds = (parts: UIMessage["parts"]): string[] => {
    const out: string[] = [];
    for (const part of parts) {
      if (
        part.type !== "tool-save_as_draft" &&
        part.type !== "tool-update_draft"
      ) {
        continue;
      }
      const p = part as {
        state?: string;
        output?: { ok?: boolean; id?: string };
      };
      if (p.state !== "output-available" || !p.output?.ok) continue;
      const id = p.output.id;
      if (typeof id !== "string" || !id) continue;
      if (!out.includes(id)) out.push(id);
    }
    return out;
  };

  if (isUser) {
    const userCitationIds: string[] = [];
    const userDraftIds: string[] = [];
    const renderedParts = message.parts.map((part, index) => {
      if (part.type === "text") {
        const sig = extractSignalIds(part.text);
        for (const id of sig.ids) {
          if (!userCitationIds.includes(id)) userCitationIds.push(id);
        }
        const drf = extractDraftIds(sig.cleanText);
        for (const id of drf.ids) {
          if (!userDraftIds.includes(id)) userDraftIds.push(id);
        }
        const cleanText = drf.cleanText;
        if (!cleanText) return null;
        return (
          <p key={index} className="whitespace-pre-wrap">
            {cleanText}
          </p>
        );
      }
      if (part.type === "file") {
        return (
          <ChatImage
            key={index}
            url={part.url}
            alt={part.filename ?? "Attachment"}
            className="mt-2 max-h-64 w-auto"
          />
        );
      }
      return null;
    });
    const hasBubbleContent = renderedParts.some((n) => n !== null);
    return (
      <Message
        data-from="user"
        className={cn("flex w-full flex-col items-end gap-1.5")}
      >
        {userCitationIds.length > 0 ? (
          <div className="flex w-full max-w-md flex-col gap-1.5">
            {userCitationIds.map((id) => (
              <UserCitationCard key={id} signalId={id} />
            ))}
          </div>
        ) : null}
        {userDraftIds.length > 0 ? (
          <div className="flex w-full max-w-md flex-col gap-1.5">
            {userDraftIds.map((id) => (
              <UserDraftCard key={id} draftId={id} />
            ))}
          </div>
        ) : null}
        {hasBubbleContent ? (
          <div className="min-w-0 max-w-[80%] rounded-2xl rounded-br-md bg-primary px-3 py-2 text-sm text-primary-foreground">
            {renderedParts}
          </div>
        ) : null}
      </Message>
    );
  }

  const newsCards = collectNewsCards(message.parts);
  const newsPending = newsCards.length === 0 && newsScanPending(message.parts);
  const draftIds = collectDraftIds(message.parts);
  const hasAnyText = message.parts.some(
    (p) => p.type === "text" && (p as { text?: string }).text,
  );

  return (
    <Message
      data-from="assistant"
      className="flex w-full flex-col items-start gap-2"
    >
      {message.parts.map((part, index) => {
        if (part.type === "text") {
          if (!part.text) return null;
          return (
            <div
              key={index}
              className="min-w-0 max-w-[85%] rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-sm text-foreground"
            >
              <Markdown className="prose prose-sm dark:prose-invert max-w-none break-words [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5 [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:mt-3 [&_h3]:mb-1.5 [&_pre]:my-2 [&_blockquote]:my-2 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                {part.text}
              </Markdown>
            </div>
          );
        }

        if (part.type === "file") {
          return (
            <ChatImage
              key={index}
              url={part.url}
              alt={part.filename ?? "Attachment"}
              className="max-h-64 w-auto"
            />
          );
        }

        if (part.type === "tool-news_scan") return null;

        if (part.type === "tool-read_draft") {
          const p = part as {
            state?: string;
            output?: {
              ok?: boolean;
              error?: string;
              draft?: EmbeddedDraftData;
            };
          };
          if (p.state !== "output-available") {
            return <ToolChip key={index} label="Opening draft…" />;
          }
          if (!p.output?.ok || !p.output.draft) {
            return <ToolChip key={index} label="Draft unavailable" />;
          }
          return (
            <div key={index} className="w-full max-w-2xl">
              <EmbeddedDraftCard draft={p.output.draft} />
            </div>
          );
        }

        if (
          part.type === "tool-save_as_draft" ||
          part.type === "tool-update_draft"
        ) {
          const p = part as {
            state?: string;
            output?: { ok?: boolean };
          };
          if (p.state === "output-available" && p.output?.ok) return null;
          const label =
            part.type === "tool-save_as_draft"
              ? "Saving draft…"
              : "Updating draft…";
          return <ToolChip key={index} label={label} />;
        }

        return renderToolChip(part.type, index);
      })}

      {newsPending && !hasAnyText ? (
        <ToolChip label="Scanning news…" />
      ) : null}

      {newsCards.length > 0 ? (
        <div className="flex w-full max-w-md flex-col gap-1.5">
          {newsCards.map((c) => (
            <NewsSignalCard
              key={c.id}
              variant="chat"
              signal={c}
              onCite={citeSignal}
            />
          ))}
        </div>
      ) : null}

      {draftIds.length > 0 ? (
        <div className="flex w-full max-w-md flex-col gap-1.5">
          {draftIds.map((id) => (
            <UserDraftCard key={id} draftId={id} />
          ))}
        </div>
      ) : null}
    </Message>
  );
}

function ToolChip({ label }: { label: string }) {
  return (
    <div className="my-2 inline-flex rounded-full border bg-muted px-2.5 py-1 text-xs text-muted-foreground">
      {label}
    </div>
  );
}

function ChatMessageFrame({
  children,
  animateIn,
}: {
  children: React.ReactNode;
  animateIn: boolean;
}) {
  return (
    <motion.div
      layout="position"
      initial={animateIn ? CHAT_ROW_MOTION.initial : false}
      animate={CHAT_ROW_MOTION.animate}
      exit={CHAT_ROW_MOTION.exit}
      transition={CHAT_ROW_TRANSITION}
    >
      {children}
    </motion.div>
  );
}

function ChatNotice({
  message,
  actions,
  onDismiss,
}: {
  message: string;
  actions?: { label: string; onClick: () => void }[];
  onDismiss?: () => void;
}) {
  return (
    <div className="mb-2 flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
      <div className="min-w-0 flex-1">
        <p>{message}</p>
        {actions && actions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {actions.map((action) => (
              <Button
                key={action.label}
                size="sm"
                variant="outline"
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          className="rounded-md p-1 text-muted-foreground transition-colors duration-200 ease-out hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

function providerErrorToNotice(
  err: ProviderErrorPayload,
  handlers: { onDismiss: () => void },
) {
  return {
    id: `${err.provider}-${err.code}`,
    message: err.message,
    onDismiss: handlers.onDismiss,
  };
}

function readGenericErrorMessage(error: Error): string {
  const parsed = decodeProviderError(error.message);
  if (parsed) return parsed.message;
  return "The chat request failed. Try again.";
}

function formatTokens(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}K`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}

function formatUsd(value: number): string {
  if (value < 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(2)}`;
}

function buildUsageTitle(usage: TokenUsage, cost: number | null): string {
  const parts = [
    `Input: ${usage.inputTokens}`,
    `Output: ${usage.outputTokens}`,
    `Cache read: ${usage.cacheReadTokens}`,
    `Cache write: ${usage.cacheCreationTokens}`,
  ];
  if (cost !== null) parts.push(`Estimated cost: ${formatUsd(cost)}`);
  return parts.join("\n");
}
