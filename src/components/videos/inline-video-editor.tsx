"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Code,
  FileText,
  Heading2,
  Italic,
  List,
  MessageSquare,
  Quote,
  Trash2,
  X,
} from "lucide-react";
import { CircularLoader } from "@/components/ui/loader";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Markdown } from "@/components/ui/markdown";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ColumnHeader } from "@/components/cockpit/column-header";
import {
  cockpitDashedPanelClass,
  cockpitIconButtonClass,
  cockpitInputClass,
} from "@/components/cockpit/cockpit-primitives";
import { cn } from "@/lib/utils";
import type { VideoRow, VideoStatus } from "@/lib/db/types";
import { VIDEO_STATUS_OPTIONS } from "@/lib/video-status";
import {
  SAVE_DEBOUNCE_MS,
  saveLabel,
  type SaveState,
} from "@/components/videos/save-status";
import { useActiveVideos } from "@/components/cockpit/active-videos-context";

type Props = {
  videoId: string;
  onClose: () => void;
  onOpenChat: (chatId: string) => void;
};

const VIDEO_EVENT_NAME = "shortform-studio:video";

const STATUS_OPTIONS = VIDEO_STATUS_OPTIONS.map((o) => ({
  status: o.status,
  label: o.shortLabel,
  dot: o.dot,
  active: o.active,
}));

export function InlineVideoEditor({ videoId, onClose, onOpenChat }: Props) {
  const { getCached } = useActiveVideos();
  const cached = getCached(videoId);
  const [video, setVideo] = useState<VideoRow | null>(cached ?? null);
  const [title, setTitle] = useState(cached?.title ?? "");
  const [hook, setHook] = useState(cached?.hook ?? "");
  const [script, setScript] = useState(cached?.script ?? "");
  const [status, setStatus] = useState<VideoStatus>(cached?.status ?? "idea");
  const [lastSaved, setLastSaved] = useState({
    title: cached?.title ?? "",
    hook: cached?.hook ?? "",
    script: cached?.script ?? "",
    status: (cached?.status ?? "idea") as VideoStatus,
  });
  const [saveState, setSaveState] = useState<SaveState>(
    cached ? "idle" : "loading",
  );
  const [editingScript, setEditingScript] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const scriptRef = useRef<HTMLTextAreaElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dirty =
    lastSaved.title !== title ||
    lastSaved.hook !== hook ||
    lastSaved.script !== script ||
    lastSaved.status !== status;

  useEffect(() => {
    let active = true;

    if (getCached(videoId)) {
      return () => {
        active = false;
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    }

    async function loadVideo() {
      try {
        const res = await fetch(`/api/videos/${videoId}`);
        if (!res.ok) throw new Error(String(res.status));
        const next = (await res.json()) as VideoRow;
        if (!active) return;
        setVideo(next);
        setTitle(next.title);
        setHook(next.hook);
        setScript(next.script);
        setStatus(next.status);
        setLastSaved({
          title: next.title,
          hook: next.hook,
          script: next.script,
          status: next.status,
        });
        setSaveState("idle");
      } catch {
        if (!active) return;
        setVideo(null);
        setSaveState("error");
        toast.error("Could not open video");
      }
    }

    void loadVideo();

    return () => {
      active = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [videoId, getCached]);

  async function save(patch: Partial<VideoRow>) {
    setSaveState("saving");
    try {
      const res = await fetch(`/api/videos/${videoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(String(res.status));
      const updated = (await res.json()) as VideoRow;
      setVideo(updated);
      setLastSaved({
        title: updated.title,
        hook: updated.hook,
        script: updated.script,
        status: updated.status,
      });
      setSaveState("saved");
      window.dispatchEvent(
        new CustomEvent(VIDEO_EVENT_NAME, {
          detail: { type: "updated", video: updated },
        }),
      );
    } catch {
      setSaveState("error");
      toast.error("Could not save video");
    }
  }

  useEffect(() => {
    if (!video || !dirty) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      void save({
        title: title.trim() || video.title,
        hook,
        script,
      });
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, hook, script]);

  function changeStatus(next: VideoStatus) {
    if (next === status) return;
    setStatus(next);
    void save({ status: next });
  }

  async function deleteVideo() {
    if (!video) return;

    try {
      const res = await fetch(`/api/videos/${video.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(String(res.status));
      window.dispatchEvent(
        new CustomEvent(VIDEO_EVENT_NAME, {
          detail: { type: "deleted", id: video.id },
        }),
      );
      onClose();
    } catch {
      toast.error("Could not delete video");
    }
  }

  function applyMarkdown(format: MarkdownFormat) {
    const textarea = scriptRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const next = formatMarkdown(script, start, end, format);
    setScript(next.value);

    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(next.selectionStart, next.selectionEnd);
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div data-no-drag>
        <ColumnHeader
          icon={FileText}
          iconTone="queue"
          title={video?.title || "Video script"}
          description={saveLabel(saveState, dirty)}
          right={
            <button
              type="button"
              aria-label="Close video editor"
              onClick={onClose}
              className={cockpitIconButtonClass}
            >
              <X className="size-4" />
            </button>
          }
        />
      </div>

      {saveState === "loading" ? (
        <div className="flex min-h-0 flex-1 items-center justify-center text-muted-foreground">
          <CircularLoader size="md" />
        </div>
      ) : !video ? (
        <div
          className={cn(
            "m-3 px-3 py-8 text-center text-xs text-muted-foreground",
            cockpitDashedPanelClass,
          )}
        >
          This video could not be opened.
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1 rounded-full border border-border bg-muted/30 p-1">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.status}
                  type="button"
                  onClick={() => changeStatus(opt.status)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
                    status === opt.status
                      ? opt.active
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className={cn("size-2 rounded-full", opt.dot)} />
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              {video.chat_id ? (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Open source chat"
                  onClick={() => onOpenChat(video.chat_id!)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <MessageSquare />
                </Button>
              ) : null}
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Delete video"
                onClick={() => setConfirmDelete(true)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 />
              </Button>
            </div>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Title
            </span>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Untitled video"
              maxLength={120}
              className={cockpitInputClass}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Hook
            </span>
            <Textarea
              value={hook}
              onChange={(event) => setHook(event.target.value)}
              placeholder="Opening line that stops the scroll."
              maxLength={500}
              className={cn("min-h-20 resize-none text-sm", cockpitInputClass)}
            />
          </label>

          <div className="flex min-h-0 flex-1 flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Script
              </span>
              {editingScript ? (
                <div className="flex items-center gap-1">
                  <MarkdownButton
                    label="Heading"
                    icon={Heading2}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyMarkdown("heading");
                    }}
                  />
                  <MarkdownButton
                    label="Bold"
                    icon={Bold}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyMarkdown("bold");
                    }}
                  />
                  <MarkdownButton
                    label="Italic"
                    icon={Italic}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyMarkdown("italic");
                    }}
                  />
                  <MarkdownButton
                    label="List"
                    icon={List}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyMarkdown("list");
                    }}
                  />
                  <MarkdownButton
                    label="Quote"
                    icon={Quote}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyMarkdown("quote");
                    }}
                  />
                  <MarkdownButton
                    label="Code"
                    icon={Code}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyMarkdown("code");
                    }}
                  />
                </div>
              ) : (
                <span className="text-[11px] text-muted-foreground">
                  Click to edit
                </span>
              )}
            </div>
            {editingScript ? (
              <Textarea
                ref={scriptRef}
                value={script}
                onChange={(event) => setScript(event.target.value)}
                onBlur={() => setEditingScript(false)}
                autoFocus
                placeholder="Write the script in Markdown."
                maxLength={4000}
                className={cn(
                  "min-h-[22rem] flex-1 resize-none font-mono text-xs leading-5",
                  cockpitInputClass,
                )}
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingScript(true)}
                className={cn(
                  "min-h-[22rem] flex-1 cursor-text overflow-y-auto rounded-md border border-input bg-transparent px-3 py-2 text-left text-sm transition-colors hover:border-ring/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                )}
              >
                {script.trim() ? (
                  <Markdown className="prose prose-sm max-w-none dark:prose-invert">
                    {script}
                  </Markdown>
                ) : (
                  <span className="text-muted-foreground">
                    Write the script in Markdown.
                  </span>
                )}
              </button>
            )}
            <div className="text-right text-[11px] text-muted-foreground">
              {script.length}/4000
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete video?"
        description={
          video?.title
            ? `"${video.title}" will be permanently deleted.`
            : "This video will be permanently deleted."
        }
        confirmLabel="Delete"
        onConfirm={deleteVideo}
      />
    </div>
  );
}

type MarkdownFormat = "heading" | "bold" | "italic" | "list" | "quote" | "code";

function MarkdownButton({
  label,
  icon: Icon,
  onMouseDown,
}: {
  label: string;
  icon: typeof Bold;
  onMouseDown: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={onMouseDown}
      className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      <Icon className="size-3.5" />
    </button>
  );
}

function formatMarkdown(
  value: string,
  start: number,
  end: number,
  format: MarkdownFormat,
) {
  const selected = value.slice(start, end);
  const fallback = placeholderFor(format);
  const text = selected || fallback;
  let replacement = text;
  let innerStart = start;
  let innerEnd = start + text.length;

  if (format === "bold") {
    replacement = `**${text}**`;
    innerStart = start + 2;
    innerEnd = innerStart + text.length;
  } else if (format === "italic") {
    replacement = `*${text}*`;
    innerStart = start + 1;
    innerEnd = innerStart + text.length;
  } else if (format === "code") {
    replacement = selected.includes("\n")
      ? `\`\`\`\n${text}\n\`\`\``
      : `\`${text}\``;
    innerStart = selected.includes("\n") ? start + 4 : start + 1;
    innerEnd = innerStart + text.length;
  } else {
    const prefix =
      format === "heading" ? "## " : format === "list" ? "- " : "> ";
    replacement = prefixLines(text, prefix);
    innerStart = start + prefix.length;
    innerEnd = start + replacement.length;
  }

  return {
    value: `${value.slice(0, start)}${replacement}${value.slice(end)}`,
    selectionStart: innerStart,
    selectionEnd: innerEnd,
  };
}

function prefixLines(value: string, prefix: string) {
  return value
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");
}

function placeholderFor(format: MarkdownFormat) {
  if (format === "heading") return "Section";
  if (format === "list") return "List item";
  if (format === "quote") return "Quote";
  if (format === "code") return "code";
  return "text";
}
