"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Brain, Check, ChevronDown, Film, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Message } from "@/components/ui/message";
import { Markdown } from "@/components/ui/markdown";
import { Loader } from "@/components/ui/loader";
import { FadeIn, Stagger, StaggerItem, StreamText } from "@/components/ui/motion";
import { ChatInput } from "./chat-input";
import { EASE_OUT } from "@/lib/motion";
import { type TokenUsage } from "@/lib/pricing";
import { PROVIDERS, type ProviderId } from "@/lib/providers";
import { cn } from "@/lib/utils";

type Props = {
  chatId: string;
  initialMessages: UIMessage[];
  initialUsage: TokenUsage;
  hasActiveKey: boolean;
  activeProviderId: ProviderId;
};

type MessageWithUsage = UIMessage & {
  metadata?: { usage?: TokenUsage };
};

const STARTER_PROMPTS = [
  "I want to grow my personal brand as an AI agency founder",
  "Help me pick a video idea about a frustrating client experience",
  "I'm a fitness coach and my reels keep flopping, what should I try",
  "Give me a controversial take for a B2B SaaS audience",
];

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

type VideoToolState =
  | { kind: "thinking"; verb: "Drafting" | "Updating" }
  | { kind: "working"; verb: "Drafting" | "Updating"; title: string }
  | { kind: "done"; verb: "Saved" | "Updated"; title: string }
  | { kind: "error"; verb: "Drafting" | "Updating"; title: string };

function readVideoPart(p: ToolPart): VideoToolState | null {
  const isCreate = p.type === "tool-create_video";
  const verbProgress = isCreate ? "Drafting" : "Updating";
  const verbDone = isCreate ? "Saved" : "Updated";
  const title =
    p.input && typeof p.input === "object" && "title" in p.input
      ? String((p.input as { title?: unknown }).title ?? "")
      : "";
  switch (p.state) {
    case "input-streaming":
      return { kind: "thinking", verb: verbProgress };
    case "input-available":
      return title
        ? { kind: "working", verb: verbProgress, title }
        : { kind: "thinking", verb: verbProgress };
    case "output-available": {
      const out = p.output as { error?: string; title?: string } | undefined;
      if (out?.error) {
        return { kind: "error", verb: verbProgress, title };
      }
      return {
        kind: "done",
        verb: verbDone,
        title: out?.title ?? title,
      };
    }
    default:
      return null;
  }
}

export function Chat({
  chatId,
  initialMessages,
  initialUsage,
  hasActiveKey,
  activeProviderId,
}: Props) {
  const router = useRouter();
  const previousStatus = useRef<string | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const [missingKey, setMissingKey] = useState(!hasActiveKey);
  const baseMessageIds = useMemo(
    () => new Set(initialMessages.map((m) => m.id)),
    [initialMessages],
  );

  const { messages, sendMessage, status, stop } = useChat({
    id: chatId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ id, messages }) => ({
        body: { id, messages },
      }),
      fetch: async (input, init) => {
        const res = await fetch(input, init);
        if (res.status === 402) {
          setMissingKey(true);
        } else if (res.ok) {
          setMissingKey(false);
        }
        return res;
      },
    }),
    onError: () => {
      // surfaced via banner; nothing else to do
    },
  });

  const isStreaming = status === "submitted" || status === "streaming";

  useEffect(() => {
    const previous = previousStatus.current;
    previousStatus.current = status;

    const generationFinished =
      (previous === "submitted" || previous === "streaming") &&
      status === "ready";

    if (generationFinished) {
      startTransition(() => {
        router.refresh();
      });
    }
  }, [router, status]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    if (stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, status]);

  function handleViewportScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 80;
  }

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

  function handleSubmit(text: string) {
    sendMessage({ text });
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

  return (
    <div className="flex h-full flex-col">
      <ScrollArea
        className="flex-1 min-h-0"
        viewportRef={viewportRef}
        onViewportScroll={handleViewportScroll}
      >
        <div className="flex w-full flex-col gap-6 px-4 py-6" role="log">
          {messages.length === 0 ? (
            <EmptyState onPick={handleSubmit} />
          ) : (
            <>
              {messages.map((m, i) => {
                const isLast = i === messages.length - 1;
                const streamingThis =
                  isLast && m.role === "assistant" && status === "streaming";
                if (baseMessageIds.has(m.id)) {
                  return (
                    <MessageRender
                      key={m.id}
                      message={m}
                      streamingThis={streamingThis}
                    />
                  );
                }
                return (
                  <FadeIn key={m.id} y={6}>
                    <MessageRender message={m} streamingThis={streamingThis} />
                  </FadeIn>
                );
              })}

              <AnimatePresence>
                {showThinking && (
                  <motion.div
                    key="thinking"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: EASE_OUT }}
                    aria-live="polite"
                    aria-label="Assistant is thinking"
                  >
                    <Message className="w-full justify-start">
                      <div className="flex items-center gap-3 rounded-2xl rounded-bl-md bg-muted px-4 py-3">
                        <Loader variant="typing" size="md" />
                        <Loader
                          variant="text-shimmer"
                          size="sm"
                          text="Thinking"
                        />
                      </div>
                    </Message>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </ScrollArea>

      <div className="shrink-0">
        <div className="w-full px-4 pb-4">
          {missingKey && (
            <Link
              href="/settings"
              className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 hover:bg-amber-500/20 dark:text-amber-300"
            >
              <span className="flex items-center gap-2">
                <KeyRound className="size-3.5" />
                Add your {PROVIDERS[activeProviderId].label} API key in
                settings to start chatting.
              </span>
              <ArrowRight className="size-3.5" />
            </Link>
          )}
          <ChatInput
            onSubmit={handleSubmit}
            disabled={isStreaming || missingKey}
            isStreaming={isStreaming}
            onStop={() => stop()}
            autoFocus
          />
          {totalTokens > 0 && (
            <div
              className="mt-1.5 text-center text-[10px] tracking-wide text-muted-foreground/70"
              title={`${totalUsage.inputTokens.toLocaleString()} input + ${totalUsage.outputTokens.toLocaleString()} output tokens`}
            >
              {formatTokens(totalTokens)} tokens this chat
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

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <FadeIn className="flex flex-col items-center gap-8 py-16 text-center">
      <div className="flex flex-col items-center gap-3">
        <h2 className="text-2xl font-semibold tracking-tight">
          What do you want to make?
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Tell me your goal, niche, or what you&apos;re stuck on. I&apos;ll pick
          a specific short-form video and walk you through it.
        </p>
      </div>
      <Stagger className="grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
        {STARTER_PROMPTS.map((prompt) => (
          <StaggerItem key={prompt}>
            <Button
              variant="outline"
              shape="card"
              onClick={() => onPick(prompt)}
              className="w-full text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              {prompt}
            </Button>
          </StaggerItem>
        ))}
      </Stagger>
    </FadeIn>
  );
}

type Segment =
  | { kind: "text"; text: string; state?: "streaming" | "done" }
  | { kind: "reasoning"; text: string; state?: "streaming" | "done" }
  | { kind: "remember"; state: RememberState }
  | { kind: "video"; state: VideoToolState };

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
    if (p.type === "tool-create_video" || p.type === "tool-update_video") {
      const s = readVideoPart(p);
      if (s) out.push({ kind: "video", state: s });
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
    if (!text) return null;
    return (
      <Message className="w-full justify-end">
        <div className="flex max-w-[80%] flex-col gap-1.5">
          <div className="whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground break-words">
            {text}
          </div>
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
                className="rounded-2xl rounded-bl-md bg-muted px-4 py-2.5 text-sm leading-relaxed break-words prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-pre:my-2 first:[&>*]:mt-0 last:[&>*]:mb-0"
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
    <div className="rounded-2xl rounded-bl-md border border-dashed border-border/60 bg-muted/30 px-3 py-2 text-xs">
      <Button
        variant="ghost"
        size="sm"
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full justify-start text-muted-foreground hover:text-foreground"
      >
        <Brain
          className={cn("size-3.5", streaming && "animate-pulse text-primary")}
        />
        <span className="font-medium">
          {streaming ? "Thinking..." : "Thought"}
        </span>
        <ChevronDown
          className={cn(
            "ml-auto size-3.5 transition-transform",
            open && "rotate-180",
          )}
        />
      </Button>
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
            <div className="mt-2 whitespace-pre-wrap text-muted-foreground/90">
              {text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function VideoChip({ state }: { state: VideoToolState }) {
  const done = state.kind === "done";
  const err = state.kind === "error";
  const label =
    state.kind === "thinking"
      ? `${state.verb} video...`
      : state.kind === "working"
        ? `${state.verb}: ${state.title}`
        : state.kind === "error"
          ? `Couldn't save: ${state.title}`
          : `${state.verb}: ${state.title}`;
  return (
    <div
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full border border-dashed px-2.5 py-1 text-xs",
        err
          ? "border-destructive/40 bg-destructive/5 text-destructive"
          : done
            ? "border-border bg-muted/50 text-muted-foreground"
            : "border-primary/30 bg-primary/5 text-primary",
      )}
    >
      {done ? (
        <Check className="size-3" />
      ) : (
        <Film className={cn("size-3", !err && "animate-pulse")} />
      )}
      <span className="break-words">{label}</span>
    </div>
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
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.18, ease: EASE_OUT }}
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full border border-dashed px-2.5 py-1 text-xs",
        done
          ? "border-border bg-muted/50 text-muted-foreground"
          : "border-primary/30 bg-primary/5 text-primary",
      )}
    >
      {done ? (
        <Check className="size-3" />
      ) : (
        <Brain className="size-3 animate-pulse" />
      )}
      <span className="break-words">{label}</span>
    </motion.div>
  );
}
