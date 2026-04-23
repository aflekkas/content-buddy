"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Message } from "./message";
import { ChatInput } from "./chat-input";
import { ThinkingIndicator } from "./thinking-indicator";
import { LogoMark } from "@/components/logo";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { estimateCostUsd, formatUsd, type TokenUsage } from "@/lib/pricing";

type Props = {
  chatId: string;
  initialMessages: UIMessage[];
  initialTitle: string | null;
  initialUsage: TokenUsage;
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

export function Chat({
  chatId,
  initialMessages,
  initialTitle,
  initialUsage,
}: Props) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const wasEmpty = useRef(initialMessages.length === 0);
  // Freeze initialUsage + the set of messages it already covers at mount, so a
  // later router.refresh (which re-renders the server component with the
  // just-persisted tokens absorbed) doesn't double-count with what we've
  // already derived client-side.
  const [seedUsage] = useState<TokenUsage>(initialUsage);
  const [baseMessageIds] = useState<Set<string>>(
    () => new Set(initialMessages.map((m) => m.id)),
  );

  const { messages, sendMessage, status, stop } = useChat({
    id: chatId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ id, messages }) => ({
        body: { id, messages },
      }),
    }),
  });

  const isStreaming = status === "submitted" || status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isStreaming]);

  useEffect(() => {
    if (wasEmpty.current && status === "ready" && messages.length >= 2) {
      wasEmpty.current = false;
      router.refresh();
    }
  }, [status, messages.length, router]);

  const totalUsage: TokenUsage = useMemo(() => {
    const total: TokenUsage = { ...seedUsage };
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
  }, [messages, seedUsage, baseMessageIds]);

  const totalCost = estimateCostUsd(totalUsage);
  const totalTokens =
    totalUsage.inputTokens +
    totalUsage.outputTokens +
    totalUsage.cacheReadTokens +
    totalUsage.cacheCreationTokens;

  function handleSubmit(text: string) {
    sendMessage({ text });
  }

  const firstUserText = messages
    .find((m) => m.role === "user")
    ?.parts.filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("")
    .trim();
  const headerTitle =
    initialTitle ||
    (firstUserText ? firstUserText.slice(0, 60) : "New chat");

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-1 data-[orientation=vertical]:h-6"
        />
        <h1 className="truncate text-sm font-medium">{headerTitle}</h1>
      </header>
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
          {messages.length === 0 ? (
            <EmptyState onPick={handleSubmit} />
          ) : (
            <>
              {messages.map((m, i) => {
                const isLast = i === messages.length - 1;
                const streamingThis =
                  isLast && m.role === "assistant" && status === "streaming";
                return (
                  <Message
                    key={m.id}
                    message={m}
                    isStreaming={streamingThis}
                  />
                );
              })}
              {(() => {
                const last = messages[messages.length - 1];
                if (!last) return null;
                if (status === "submitted" && last.role === "user") {
                  return <ThinkingIndicator key="thinking" />;
                }
                if (status === "streaming" && last.role === "assistant") {
                  const hasText = last.parts.some(
                    (p) => p.type === "text" && p.text.length > 0,
                  );
                  if (!hasText) return <ThinkingIndicator key="thinking" />;
                }
                return null;
              })()}
            </>
          )}
        </div>
      </div>
      <div className="shrink-0">
        <div className="mx-auto w-full max-w-3xl px-4 pb-4">
          <ChatInput
            onSubmit={handleSubmit}
            disabled={isStreaming}
            isStreaming={isStreaming}
            onStop={() => stop()}
            autoFocus
          />
          {totalTokens > 0 && (
            <div
              className="mt-1.5 text-center text-[10px] tracking-wide text-muted-foreground/70"
              title={`${totalUsage.inputTokens.toLocaleString()} input + ${totalUsage.cacheReadTokens.toLocaleString()} cached-read + ${totalUsage.cacheCreationTokens.toLocaleString()} cached-write + ${totalUsage.outputTokens.toLocaleString()} output tokens`}
            >
              {formatUsd(totalCost)} this chat ·{" "}
              {formatTokens(totalTokens)} tokens
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
    <div className="flex flex-col items-center gap-8 py-16 text-center">
      <div className="flex flex-col items-center gap-3">
        <LogoMark size={48} className="text-primary" />
        <h2 className="text-2xl font-semibold tracking-tight">
          What do you want to make?
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Tell me your goal, niche, or what you&apos;re stuck on. I&apos;ll pick a specific short-form video and walk you through it.
        </p>
      </div>
      <div className="grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
        {STARTER_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onPick(prompt)}
            className="rounded-xl border bg-card px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
