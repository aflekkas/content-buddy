import type { VideoRow, VideoStatus } from "@/lib/db/types";

export type VideoExportFormat = "csv" | "markdown" | "notion";

export type VideoExportPayload = {
  body: string;
  contentType: string;
  filename: string;
};

const STATUS_LABELS: Record<VideoStatus, string> = {
  idea: "Idea",
  ready: "Ready to film",
  filmed: "Filmed",
};

export function isVideoExportFormat(
  value: string | null,
): value is VideoExportFormat {
  return value === "csv" || value === "markdown" || value === "notion";
}

export function buildVideoExport(
  videos: VideoRow[],
  format: VideoExportFormat,
  exportedAt = new Date(),
): VideoExportPayload {
  const stamp = formatDateStamp(exportedAt);

  if (format === "markdown") {
    return {
      body: videosToMarkdown(videos, exportedAt),
      contentType: "text/markdown; charset=utf-8",
      filename: `shortform-videos-${stamp}.md`,
    };
  }

  const notionMode = format === "notion";
  return {
    body: videosToCsv(videos, notionMode),
    contentType: "text/csv; charset=utf-8",
    filename: `shortform-videos-${format}-${stamp}.csv`,
  };
}

export function videosToCsv(videos: VideoRow[], notionMode = false): string {
  const headers = notionMode
    ? [
        "Name",
        "Status",
        "Hook",
        "Script",
        "Chat ID",
        "Created",
        "Updated",
        "Filmed",
      ]
    : [
        "Title",
        "Status",
        "Hook",
        "Script",
        "Chat ID",
        "Created At",
        "Updated At",
        "Filmed At",
      ];

  const rows = videos.map((video) => [
    video.title,
    STATUS_LABELS[video.status],
    video.hook,
    video.script,
    video.chat_id ?? "",
    video.created_at,
    video.updated_at,
    video.filmed_at ?? "",
  ]);

  return [[...headers], ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
}

export function videosToMarkdown(
  videos: VideoRow[],
  exportedAt = new Date(),
): string {
  const lines = [
    "# Video Queue",
    "",
    `Exported ${exportedAt.toISOString()}`,
    "",
  ];

  if (videos.length === 0) {
    lines.push("_No videos yet._");
    return lines.join("\n");
  }

  for (const video of videos) {
    lines.push(`## ${video.title || "Untitled video"}`);
    lines.push("");
    lines.push(`- Status: ${STATUS_LABELS[video.status]}`);
    lines.push(`- Created: ${video.created_at}`);
    lines.push(`- Updated: ${video.updated_at}`);
    if (video.filmed_at) lines.push(`- Filmed: ${video.filmed_at}`);
    if (video.chat_id) lines.push(`- Chat ID: ${video.chat_id}`);
    if (video.hook) {
      lines.push("");
      lines.push("### Hook");
      lines.push("");
      lines.push(video.hook);
    }
    if (video.script) {
      lines.push("");
      lines.push("### Script");
      lines.push("");
      lines.push(video.script);
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function formatDateStamp(date: Date): string {
  return date.toISOString().slice(0, 10);
}
