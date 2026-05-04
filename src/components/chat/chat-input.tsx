"use client";

import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, Paperclip, Square, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChatImage } from "./chat-image";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
} from "@/components/ui/prompt-input";
import { cn } from "@/lib/utils";

export type ChatAttachment = {
  url: string;
  path: string;
  mediaType: string;
  filename: string;
};

type Props = {
  onSubmit: (text: string, attachments: ChatAttachment[]) => void;
  disabled?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
  autoFocus?: boolean;
  attachmentsDisabled?: boolean;
  attachmentsDisabledReason?: string;
};

export function ChatInput({
  onSubmit,
  disabled,
  isStreaming,
  onStop,
  autoFocus,
  attachmentsDisabled,
  attachmentsDisabledReason,
}: Props) {
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [uploading, setUploading] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function onInsert(event: Event) {
      const detail = (event as CustomEvent<{ text?: string; append?: boolean }>)
        .detail;
      const text = detail?.text;
      if (typeof text !== "string" || !text) return;
      setValue((current) => {
        if (detail?.append && current.trim().length > 0) {
          return `${current}\n\n${text}`;
        }
        return text;
      });
    }
    window.addEventListener("chat:input-paste", onInsert);
    return () => window.removeEventListener("chat:input-paste", onInsert);
  }, []);

  function send() {
    const trimmed = value.trim();
    if ((!trimmed && attachments.length === 0) || isStreaming || disabled) {
      return;
    }
    if (uploading > 0) return;
    onSubmit(trimmed, attachments);
    setValue("");
    setAttachments([]);
  }

  async function uploadFile(file: File) {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/chat/attachments", {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const code = (data as { error?: string }).error;
      const msg =
        code === "unsupported_type"
          ? "Unsupported file type"
          : code === "file_too_large"
            ? "File too large (max 8 MB)"
            : "Upload failed";
      throw new Error(msg);
    }
    return (await res.json()) as ChatAttachment;
  }

  async function ingestFiles(files: FileList | File[]) {
    if (attachmentsDisabled) {
      if (attachmentsDisabledReason) toast.error(attachmentsDisabledReason);
      return;
    }
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploading((n) => n + list.length);
    for (const file of list) {
      try {
        const attachment = await uploadFile(file);
        setAttachments((prev) => [...prev, attachment]);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading((n) => Math.max(0, n - 1));
      }
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    if (attachmentsDisabled) return;
    const items = event.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (const item of items) {
      if (item.kind !== "file") continue;
      const file = item.getAsFile();
      if (file && file.type.startsWith("image/")) files.push(file);
    }
    if (files.length === 0) return;
    event.preventDefault();
    void ingestFiles(files);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    if (event.dataTransfer.files?.length) {
      void ingestFiles(event.dataTransfer.files);
    }
  }

  function removeAttachment(path: string) {
    setAttachments((prev) => prev.filter((a) => a.path !== path));
  }

  const sendDisabled =
    !isStreaming &&
    (disabled ||
      uploading > 0 ||
      (!value.trim() && attachments.length === 0));

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        if (!attachmentsDisabled) setDragActive(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
      onPaste={handlePaste}
      className={cn(
        "relative rounded-xl transition-colors",
        dragActive && "ring-2 ring-primary",
      )}
    >
      {isStreaming && (
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-px rounded-xl animate-border-beam"
          style={{
            background:
              "conic-gradient(from var(--beam-angle), transparent 0%, var(--color-primary) 18%, transparent 32%, transparent 100%)",
            WebkitMask:
              "linear-gradient(#000,#000) content-box, linear-gradient(#000,#000)",
            WebkitMaskComposite: "xor",
            mask: "linear-gradient(#000,#000) content-box, linear-gradient(#000,#000)",
            maskComposite: "exclude",
            padding: "1.5px",
            zIndex: 1,
          }}
        />
      )}
      <PromptInput
        value={value}
        onValueChange={setValue}
        onSubmit={send}
        isLoading={isStreaming}
        disabled={disabled}
        className="flex flex-col gap-2 rounded-xl border-border bg-background shadow-sm hover:ring-primary/20 focus-within:ring-primary/40"
      >
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-2 pt-2">
            {attachments.map((a) => (
              <div key={a.path} className="group relative">
                <ChatImage url={a.url} alt={a.filename} className="size-16" />
                <button
                  type="button"
                  onClick={() => removeAttachment(a.path)}
                  className="absolute right-0.5 top-0.5 z-10 rounded-full bg-background/80 p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Remove attachment"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
            {uploading > 0 &&
              Array.from({ length: uploading }).map((_, i) => (
                <div
                  key={`up-${i}`}
                  className="size-16 animate-pulse rounded-md border border-border bg-muted"
                />
              ))}
          </div>
        )}
        <PromptInputTextarea
          placeholder="Tell me what you want to make..."
          autoFocus={autoFocus}
          disabled={disabled}
          className="px-2 py-1.5"
        />
        <PromptInputActions className="justify-between">
          <PromptInputAction
            tooltip={
              attachmentsDisabled
                ? (attachmentsDisabledReason ?? "Attachments unavailable")
                : "Attach image"
            }
          >
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="rounded-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || attachmentsDisabled}
            >
              <Paperclip />
            </Button>
          </PromptInputAction>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) void ingestFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <PromptInputAction tooltip={isStreaming ? "Stop generating" : "Send"}>
            <Button
              type="button"
              size="icon"
              variant="default"
              className="rounded-full"
              onClick={isStreaming ? onStop : send}
              disabled={sendDisabled}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={isStreaming ? "stop" : "send"}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.12, ease: "easeOut" }}
                  className="inline-flex"
                >
                  {isStreaming ? <Square className="fill-current" /> : <ArrowUp />}
                </motion.span>
              </AnimatePresence>
            </Button>
          </PromptInputAction>
        </PromptInputActions>
      </PromptInput>
    </div>
  );
}
