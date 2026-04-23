"use client";

import { Brain, Check } from "lucide-react";
import type { UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/logo";

type Props = {
  message: UIMessage;
  isStreaming?: boolean;
};

type RememberState =
  | { kind: "thinking" }
  | { kind: "saving"; fact: string }
  | { kind: "saved"; fact: string }
  | { kind: "duplicate"; fact: string };

type ToolPart = {
  type: string;
  state?: string;
  input?: { fact?: string } | unknown;
  output?: { saved?: boolean; reason?: string } | unknown;
};

function readRememberParts(message: UIMessage): RememberState[] {
  const parts = message.parts as ToolPart[];
  return parts
    .filter((p) => p.type === "tool-remember_user_fact")
    .map((p): RememberState | null => {
      const fact =
        p.input && typeof p.input === "object" && "fact" in p.input
          ? String((p.input as { fact?: unknown }).fact ?? "")
          : "";
      switch (p.state) {
        case "input-streaming":
          return { kind: "thinking" };
        case "input-available":
          return fact
            ? { kind: "saving", fact }
            : { kind: "thinking" };
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
    })
    .filter((s): s is RememberState => s !== null);
}

export function Message({ message, isStreaming }: Props) {
  const isUser = message.role === "user";
  const text = message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");

  const remembers = isUser ? [] : readRememberParts(message);
  const hasContent = text.length > 0 || remembers.length > 0;

  if (!isUser && !hasContent) return null;

  return (
    <div
      className={cn(
        "flex w-full gap-3",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      {!isUser && <LogoMark size={40} className="mt-0.5" />}
      <div className="flex max-w-[80%] flex-col gap-1.5">
        {remembers.map((r, i) => (
          <RememberChip key={i} state={r} />
        ))}
        {text.length > 0 && (
          <div
            className={cn(
              "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
              isUser
                ? "bg-primary text-primary-foreground rounded-br-md whitespace-pre-wrap"
                : "bg-muted rounded-bl-md",
            )}
          >
            {isUser ? (
              text
            ) : (
              <MarkdownText text={text} />
            )}
            {isStreaming && !isUser && (
              <span
                aria-hidden
                className="ml-0.5 inline-block h-[1em] w-[0.55em] -mb-[0.12em] rounded-[1px] bg-current animate-pulse"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MarkdownText({ text }: { text: string }) {
  return (
    <div
      className={cn(
        "prose-sm max-w-none",
        "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        "[&_p]:my-2 [&_p]:leading-relaxed",
        "[&_strong]:font-semibold",
        "[&_em]:italic",
        "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5",
        "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5",
        "[&_li]:my-0.5 [&_li]:leading-relaxed",
        "[&_li>p]:my-0",
        "[&_h1]:mt-3 [&_h1]:mb-1.5 [&_h1]:text-base [&_h1]:font-semibold",
        "[&_h2]:mt-3 [&_h2]:mb-1.5 [&_h2]:text-base [&_h2]:font-semibold",
        "[&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold",
        "[&_a]:underline [&_a]:underline-offset-2",
        "[&_code]:rounded [&_code]:bg-background/60 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em]",
        "[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-background/60 [&_pre]:p-3",
        "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
        "[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
        "[&_hr]:my-3",
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
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
    <div
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
    </div>
  );
}
