"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  ListVideo,
  MessageSquare,
  MoreHorizontal,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { EASE_OUT } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ColumnHeader } from "@/components/cockpit/column-header";
import { cn } from "@/lib/utils";
import type { VideoRow, VideoStatus } from "@/lib/db/types";

type Props = {
  videos: VideoRow[];
};

type StatusFilter = "all" | VideoStatus;

const STATUS_META: Record<
  VideoStatus,
  { label: string; shortLabel: string; chip: string }
> = {
  idea: {
    label: "Idea",
    shortLabel: "Ideas",
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  },
  ready: {
    label: "Ready to film",
    shortLabel: "Ready",
    chip: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
  },
  filmed: {
    label: "Filmed",
    shortLabel: "Filmed",
    chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  },
};

const FILTER_ORDER: StatusFilter[] = ["all", "idea", "ready", "filmed"];

export function VideoQueue({ videos }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(videos);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [pendingDelete, setPendingDelete] = useState<VideoRow | null>(null);

  const counts = useMemo(() => {
    const base = { all: items.length, idea: 0, ready: 0, filmed: 0 };
    for (const video of items) base[video.status] += 1;
    return base;
  }, [items]);

  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((video) => {
      if (statusFilter !== "all" && video.status !== statusFilter) return false;
      if (!q) return true;
      return (
        video.title.toLowerCase().includes(q) ||
        video.hook.toLowerCase().includes(q)
      );
    });
  }, [items, query, statusFilter]);

  async function updateStatus(id: string, status: VideoStatus) {
    const prev = items;
    setItems((current) =>
      current.map((video) => (video.id === id ? { ...video, status } : video)),
    );

    try {
      const res = await fetch(`/api/videos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("update_failed");
      router.refresh();
    } catch {
      setItems(prev);
      toast.error("Could not update video");
    }
  }

  async function removeVideo(id: string) {
    const prev = items;
    setItems((current) => current.filter((video) => video.id !== id));

    try {
      const res = await fetch(`/api/videos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete_failed");
      router.refresh();
    } catch {
      setItems(prev);
      toast.error("Could not delete video");
    }
  }

  const hasAnyVideos = items.length > 0;
  const hasVisible = visibleItems.length > 0;

  return (
    <div className="flex h-full flex-col">
      <ColumnHeader
        icon={ListVideo}
        title="Video queue"
        description="Keep track of what to make next."
      />

      {hasAnyVideos && (
        <div className="space-y-2 border-b bg-background/80 px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search videos"
              className="pl-8"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {FILTER_ORDER.map((key) => {
              const active = statusFilter === key;
              const label =
                key === "all" ? "All" : STATUS_META[key].shortLabel;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key)}
                  className={cn(
                    "relative inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                    active
                      ? "border-primary text-primary-foreground"
                      : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="video-filter-active"
                      aria-hidden
                      className="absolute inset-0 -z-0 rounded-full bg-primary"
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 40,
                      }}
                    />
                  )}
                  <span className="relative z-10">{label}</span>
                  <span
                    className={cn(
                      "relative z-10 rounded-full px-1 text-[10px] tabular-nums",
                      active
                        ? "bg-primary-foreground/25 text-primary-foreground"
                        : "bg-background/60 text-muted-foreground",
                    )}
                  >
                    {counts[key]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {!hasAnyVideos ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No videos yet — chat with your buddy to build your queue.
          </div>
        ) : !hasVisible ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No videos match your filter.
          </div>
        ) : (
          <ul className="space-y-2 p-4">
            <AnimatePresence initial={false}>
              {visibleItems.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  onChangeStatus={(status) =>
                    void updateStatus(video.id, status)
                  }
                  onOpenChat={() => {
                    if (video.chat_id) {
                      router.push(`/dashboard/chat/${video.chat_id}`);
                    }
                  }}
                  onRequestDelete={() => setPendingDelete(video)}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this video?</DialogTitle>
            <DialogDescription>
              {pendingDelete?.title
                ? `"${pendingDelete.title}" will be removed from your queue.`
                : "This video will be removed from your queue."}{" "}
              This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (pendingDelete) {
                  const id = pendingDelete.id;
                  setPendingDelete(null);
                  void removeVideo(id);
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type VideoCardProps = {
  video: VideoRow;
  onChangeStatus: (status: VideoStatus) => void;
  onOpenChat: () => void;
  onRequestDelete: () => void;
};

function VideoCard({
  video,
  onChangeStatus,
  onOpenChat,
  onRequestDelete,
}: VideoCardProps) {
  const meta = STATUS_META[video.status];
  const updated = formatRelativeTime(video.updated_at);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2, ease: EASE_OUT }}
      className="flex items-start gap-2 rounded-xl border border-border bg-muted/20 p-3 transition-colors hover:bg-muted/35"
    >
      <button
        type="button"
        onClick={() => {
          if (video.chat_id) onOpenChat();
        }}
        disabled={!video.chat_id}
        className={cn(
          "min-w-0 flex-1 text-left",
          !video.chat_id && "cursor-default",
        )}
      >
        <div className="mb-1.5 flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
              meta.chip,
            )}
          >
            {meta.label}
          </span>
          {updated && (
            <span className="text-[10px] text-muted-foreground">
              {updated}
            </span>
          )}
        </div>
        <p className="truncate text-sm font-medium text-foreground">
          {video.title || "Untitled video"}
        </p>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
          {video.hook || "No hook yet."}
        </p>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Video actions"
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <MoreHorizontal />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-48 p-1">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Move to</DropdownMenuLabel>
            {(Object.keys(STATUS_META) as VideoStatus[]).map((status) => (
              <DropdownMenuItem
                key={status}
                disabled={status === video.status}
                onClick={(event) => {
                  event.preventDefault();
                  if (status !== video.status) onChangeStatus(status);
                }}
              >
                <span
                  className={cn(
                    "mr-2 size-2 rounded-full",
                    status === "idea" && "bg-amber-400",
                    status === "ready" && "bg-sky-400",
                    status === "filmed" && "bg-emerald-500",
                  )}
                />
                {STATUS_META[status].label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={!video.chat_id}
            onClick={(event) => {
              event.preventDefault();
              if (video.chat_id) onOpenChat();
            }}
          >
            <MessageSquare className="mr-2 size-4" />
            Open in chat
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={(event) => {
              event.preventDefault();
              onRequestDelete();
            }}
          >
            <Trash2 className="mr-2 size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.li>
  );
}

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  if (diffMs < 0) return "just now";
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk}w ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  const yr = Math.floor(day / 365);
  return `${yr}y ago`;
}
