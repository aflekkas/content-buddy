import { describe, expect, it } from "vitest";
import { buildVideoExport, videosToCsv, videosToMarkdown } from "./video-export";
import type { VideoRow } from "@/lib/db/types";

const videos: VideoRow[] = [
  {
    id: "video-1",
    user_id: "user-1",
    chat_id: "chat-1",
    title: 'Hook with "quotes"',
    hook: "First line\nsecond line",
    script: "A,B,C",
    status: "ready",
    created_at: "2026-04-01T10:00:00.000Z",
    updated_at: "2026-04-02T11:00:00.000Z",
    filmed_at: null,
  },
];

describe("video export", () => {
  it("escapes CSV cells", () => {
    expect(videosToCsv(videos)).toBe(
      [
        '"Title","Status","Hook","Script","Chat ID","Created At","Updated At","Filmed At"',
        '"Hook with ""quotes""","Ready to film","First line\nsecond line","A,B,C","chat-1","2026-04-01T10:00:00.000Z","2026-04-02T11:00:00.000Z",""',
      ].join("\r\n"),
    );
  });

  it("uses Notion-friendly CSV headers", () => {
    expect(videosToCsv(videos, true).split("\r\n")[0]).toBe(
      '"Name","Status","Hook","Script","Chat ID","Created","Updated","Filmed"',
    );
  });

  it("builds markdown with status and sections", () => {
    expect(
      videosToMarkdown(videos, new Date("2026-04-03T12:00:00.000Z")),
    ).toContain("## Hook with \"quotes\"\n\n- Status: Ready to film");
    expect(videosToMarkdown([], new Date("2026-04-03T12:00:00.000Z"))).toContain(
      "_No videos yet._",
    );
  });

  it("sets content type and dated filename", () => {
    expect(
      buildVideoExport(videos, "markdown", new Date("2026-04-03T12:00:00.000Z")),
    ).toMatchObject({
      contentType: "text/markdown; charset=utf-8",
      filename: "shortform-videos-2026-04-03.md",
    });
  });
});
