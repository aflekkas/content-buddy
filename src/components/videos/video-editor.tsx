"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, MessageSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { VideoRow, VideoStatus } from "@/lib/db/types";
import { VIDEO_STATUS_OPTIONS } from "@/lib/video-status";
import {
  SAVE_DEBOUNCE_MS,
  SaveIndicator,
  type SaveState,
} from "@/components/videos/save-status";

const STATUS_OPTIONS = VIDEO_STATUS_OPTIONS.map((o) => ({
  status: o.status,
  label: o.shortLabel,
  dot: o.dot,
  active: o.active,
}));

type Props = {
  video: VideoRow;
};

export function VideoEditor({ video }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(video.title);
  const [hook, setHook] = useState(video.hook);
  const [script, setScript] = useState(video.script);
  const [status, setStatus] = useState<VideoStatus>(video.status);
  const [lastSaved, setLastSaved] = useState({
    title: video.title,
    hook: video.hook,
    script: video.script,
    status: video.status,
  });
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dirty =
    lastSaved.title !== title ||
    lastSaved.hook !== hook ||
    lastSaved.script !== script ||
    lastSaved.status !== status;

  async function save(patch: Partial<VideoRow>) {
    setSaveState("saving");
    try {
      const res = await fetch(`/api/videos/${video.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(String(res.status));
      const updated = (await res.json()) as VideoRow;
      setLastSaved({
        title: updated.title,
        hook: updated.hook,
        script: updated.script,
        status: updated.status,
      });
      setSaveState("saved");
    } catch {
      setSaveState("error");
      toast.error("Couldn't save changes");
    }
  }

  useEffect(() => {
    if (!dirty) return;
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
    setConfirmingDelete(false);
    try {
      const res = await fetch(`/api/videos/${video.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(String(res.status));
      router.push("/dashboard");
    } catch {
      toast.error("Couldn't delete video");
    }
  }

  const titleError = title.trim().length > 0 && title.trim().length < 3;

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-6 px-4 py-6 md:py-8">
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard")}
          className="-ml-2 text-muted-foreground"
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <SaveIndicator state={saveState} dirty={dirty} />
          {video.chat_id && (
            <Link
              href={`/dashboard/chat/${video.chat_id}`}
              className={buttonVariants({ size: "sm", variant: "outline" })}
            >
              <MessageSquare className="size-3.5" />
              Open chat
            </Link>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 rounded-full border border-border bg-muted/30 p-1 self-start">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.status}
            type="button"
            onClick={() => changeStatus(opt.status)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
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

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Title
        </span>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled video"
          maxLength={120}
          aria-invalid={titleError || undefined}
        />
        {titleError && (
          <span className="text-xs text-destructive">
            Title must be at least 3 characters.
          </span>
        )}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Hook
        </span>
        <Textarea
          value={hook}
          onChange={(e) => setHook(e.target.value)}
          placeholder="The opening line that stops the scroll."
          maxLength={500}
          className="min-h-20"
        />
        <span className="text-[11px] text-muted-foreground">
          {hook.length}/500
        </span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Script
        </span>
        <Textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          placeholder="Full script. Mark scene cuts on new lines."
          maxLength={4000}
          className="min-h-[40vh] font-mono text-sm leading-6"
        />
        <span className="text-[11px] text-muted-foreground">
          {script.length}/4000
        </span>
      </label>

      <Dialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this video?</DialogTitle>
            <DialogDescription>
              {title.trim()
                ? `"${title.trim()}" will be removed from your queue.`
                : "This video will be removed from your queue."}{" "}
              This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmingDelete(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteVideo}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

