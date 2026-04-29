import type { VideoStatus } from "@/lib/db/types";

export type VideoStatusOption = {
  status: VideoStatus;
  label: string;
  shortLabel: string;
  dot: string;
  chip: string;
  active: string;
};

export const VIDEO_STATUS_OPTIONS: VideoStatusOption[] = [
  {
    status: "idea",
    label: "Idea",
    shortLabel: "Idea",
    dot: "bg-amber-400",
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
    active:
      "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200",
  },
  {
    status: "ready",
    label: "Ready to film",
    shortLabel: "Ready",
    dot: "bg-sky-400",
    chip: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
    active: "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200",
  },
  {
    status: "filmed",
    label: "Filmed",
    shortLabel: "Filmed",
    dot: "bg-emerald-500",
    chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
    active:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200",
  },
];

export const VIDEO_STATUS_BY_KEY: Record<VideoStatus, VideoStatusOption> =
  VIDEO_STATUS_OPTIONS.reduce(
    (acc, opt) => {
      acc[opt.status] = opt;
      return acc;
    },
    {} as Record<VideoStatus, VideoStatusOption>,
  );
