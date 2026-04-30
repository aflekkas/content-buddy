"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  Download,
  FileText,
  FileSpreadsheet,
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
import {
  cockpitInputClass,
  cockpitSoftPanelClass,
} from "@/components/cockpit/cockpit-primitives";
import { createClient } from "@/lib/supabase/client";
import { useActiveVideos } from "@/components/cockpit/active-videos-context";
import { cn } from "@/lib/utils";
import type { VideoRow, VideoStatus } from "@/lib/db/types";
import type { VideoExportFormat } from "@/lib/video-export";

type Props = {
  userId: string;
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
const VIDEO_EVENT_NAME = "shortform-studio:video";
const STATUS_FILTER_STORAGE_KEY = "shortform-studio:video-queue:status-filter";
const QUERY_STORAGE_KEY = "shortform-studio:video-queue:query";

function isStatusFilter(value: unknown): value is StatusFilter {
  return (
    typeof value === "string" &&
    (FILTER_ORDER as string[]).includes(value)
  );
}

function subscribeToLocalStorage(key: string, onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  function handler(event: StorageEvent) {
    if (event.key === key) onChange();
  }
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

function useLocalStorageString(key: string, fallback: string) {
  const subscribe = useCallback(
    (onChange: () => void) => subscribeToLocalStorage(key, onChange),
    [key],
  );
  const getSnapshot = useCallback(() => {
    try {
      return window.localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  }, [key, fallback]);
  const value = useSyncExternalStore(subscribe, getSnapshot, () => fallback);
  const setValue = useCallback(
    (next: string) => {
      try {
        if (next === fallback) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, next);
        window.dispatchEvent(new StorageEvent("storage", { key }));
      } catch {}
    },
    [key, fallback],
  );
  return [value, setValue] as const;
}

type VideoQueueEvent =
  | { type: "updated"; video: VideoRow }
  | { type: "deleted"; id: string };

export function VideoQueue({ userId, videos }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { openVideo, primeCache } = useActiveVideos();
  const [items, setItems] = useState(() => sortVideos(videos));
  const [storedQuery, setStoredQuery] = useLocalStorageString(
    QUERY_STORAGE_KEY,
    "",
  );
  const [storedFilter, setStoredFilter] = useLocalStorageString(
    STATUS_FILTER_STORAGE_KEY,
    "all",
  );
  const query = storedQuery;
  const setQuery = setStoredQuery;
  const statusFilter: StatusFilter = isStatusFilter(storedFilter)
    ? storedFilter
    : "all";
  const setStatusFilter = setStoredFilter;
  const [pendingDelete, setPendingDelete] = useState<VideoRow | null>(null);
  const [exportingFormat, setExportingFormat] =
    useState<VideoExportFormat | null>(null);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    const syncVideos = async () => {
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (!active || error) return;
      setItems(sortVideos((data ?? []) as VideoRow[]));
    };

    const channel = supabase
      .channel(`videos:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "videos",
        },
        (payload) => {
          setItems((current) => {
            if (
              payload.eventType === "INSERT" ||
              payload.eventType === "UPDATE"
            ) {
              const video = payload.new as VideoRow;
              if (video.user_id !== userId) return current;
              return upsertVideo(current, video);
            }

            if (payload.eventType === "DELETE") {
              const deleted = payload.old as Pick<VideoRow, "id">;
              return current.filter((video) => video.id !== deleted.id);
            }

            return current;
          });
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void syncVideos();
        }
      });

    void syncVideos();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    function handleVideoEvent(event: Event) {
      const detail = (event as CustomEvent<VideoQueueEvent>).detail;
      if (!detail) return;

      if (detail.type === "updated" && detail.video.user_id === userId) {
        setItems((current) => upsertVideo(current, detail.video));
      } else if (detail.type === "deleted") {
        setItems((current) => current.filter((video) => video.id !== detail.id));
      }
    }

    window.addEventListener(VIDEO_EVENT_NAME, handleVideoEvent);
    return () => window.removeEventListener(VIDEO_EVENT_NAME, handleVideoEvent);
  }, [userId]);

  useEffect(() => {
    primeCache(items);
  }, [items, primeCache]);

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
    } catch {
      setItems(prev);
      toast.error("Could not delete video");
    }
  }

  async function exportQueue(format: VideoExportFormat) {
    setExportingFormat(format);
    try {
      const res = await fetch(`/api/videos/export?format=${format}`);
      if (!res.ok) throw new Error("export_failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = getDownloadFilename(
        res.headers.get("Content-Disposition"),
        `shortform-videos.${format === "markdown" ? "md" : "csv"}`,
      );
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Export downloaded");
    } catch {
      toast.error("Could not export videos");
    } finally {
      setExportingFormat(null);
    }
  }

  function openVideoScript(videoId: string) {
    openVideo(videoId);
    if (!pathname.startsWith("/dashboard/chat/")) {
      router.push("/dashboard/chat/new", { scroll: false });
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
        right={
          hasAnyVideos ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Export videos"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Download />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-44 p-1">
                <DropdownMenuLabel>Export</DropdownMenuLabel>
                <DropdownMenuItem
                  disabled={exportingFormat !== null}
                  onClick={(event) => {
                    event.preventDefault();
                    void exportQueue("csv");
                  }}
                >
                  <FileSpreadsheet className="mr-2 size-4" />
                  CSV
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={exportingFormat !== null}
                  onClick={(event) => {
                    event.preventDefault();
                    void exportQueue("markdown");
                  }}
                >
                  <FileText className="mr-2 size-4" />
                  Markdown
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={exportingFormat !== null}
                  onClick={(event) => {
                    event.preventDefault();
                    void exportQueue("notion");
                  }}
                >
                  <FileSpreadsheet className="mr-2 size-4" />
                  Notion CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null
        }
      />

      {hasAnyVideos && (
        <div className="space-y-2.5 border-b bg-background/80 px-3 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search videos"
              className={cn("h-8 rounded-md pl-8 text-xs", cockpitInputClass)}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTER_ORDER.map((key) => {
              const active = statusFilter === key;
              const label =
                key === "all" ? "All" : STATUS_META[key].shortLabel;
              return (
                <Button
                  key={key}
                  variant="ghost"
                  size="sm"
                  shape="pill"
                  type="button"
                  onClick={() => setStatusFilter(key)}
                  className={cn(
                    "relative h-7 gap-1.5 px-2.5 text-xs",
                    active
                      ? "border border-primary text-primary-foreground"
                      : "border border-border bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="video-filter-active"
                      aria-hidden
                      className="absolute inset-0 z-0 rounded-full bg-primary"
                      transition={{ duration: 0.18, ease: EASE_OUT }}
                    />
                  )}
                  <span className="relative z-10">{label}</span>
                  <span className="relative z-10 text-xs tabular-nums opacity-80">
                    {counts[key]}
                  </span>
                </Button>
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
          <motion.ul layout className="space-y-1.5 p-3">
            <AnimatePresence initial={false} mode="popLayout">
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
                  onOpenScript={() => openVideoScript(video.id)}
                  onRequestDelete={() => setPendingDelete(video)}
                />
              ))}
            </AnimatePresence>
          </motion.ul>
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

function upsertVideo(items: VideoRow[], video: VideoRow) {
  const exists = items.some((item) => item.id === video.id);
  if (!exists) return sortVideos([video, ...items]);

  return sortVideos(
    items.map((item) => (item.id === video.id ? { ...item, ...video } : item)),
  );
}

function sortVideos(videos: VideoRow[]) {
  return [...videos].sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );
}

function getDownloadFilename(
  contentDisposition: string | null,
  fallback: string,
) {
  const match = contentDisposition?.match(/filename="([^"]+)"/);
  return match?.[1] ?? fallback;
}

type VideoCardProps = {
  video: VideoRow;
  onChangeStatus: (status: VideoStatus) => void;
  onOpenChat: () => void;
  onOpenScript: () => void;
  onRequestDelete: () => void;
};

const VideoCard = forwardRef<HTMLLIElement, VideoCardProps>(function VideoCard(
  { video, onChangeStatus, onOpenChat, onOpenScript, onRequestDelete },
  ref,
) {
  const meta = STATUS_META[video.status];
  const updated = formatRelativeTime(video.updated_at);

  return (
    <motion.li
      ref={ref}
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2, ease: EASE_OUT }}
      className={cn(
        "group flex min-w-0 items-start gap-2 p-2.5 transition-colors hover:bg-muted/35",
        cockpitSoftPanelClass,
      )}
    >
      <button
        type="button"
        onClick={onOpenScript}
        className="min-w-0 flex-1 appearance-none rounded-md bg-transparent p-0 text-left text-inherit outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/40"
      >
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              meta.chip,
            )}
          >
            {meta.label}
          </span>
          {updated && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {updated}
            </span>
          )}
        </div>
        <p className="mt-1.5 truncate text-[13px] font-semibold leading-5 text-foreground">
          {video.title || "Untitled video"}
        </p>
        <p className="mt-0.5 line-clamp-2 break-words text-xs leading-5 text-muted-foreground">
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
            onClick={(event) => {
              event.preventDefault();
              onOpenScript();
            }}
          >
            <FileText className="mr-2 size-4" />
            Open script
          </DropdownMenuItem>
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
});

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
