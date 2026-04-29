import { AUDIENCE_LABEL, GOAL_LABEL } from "@/lib/labels";
import type { UserFactRow, UserProfileRow } from "@/lib/db/types";

export const DEFAULT_MEMORY_PATH = "identity.md";
export const AUTOLOAD_MEMORY_PATHS = new Set(["identity.md", "facts.md"]);
export const PROTECTED_MEMORY_PATHS = new Set(["identity.md", "facts.md"]);
export const SYSTEM_PROMPT_VIRTUAL_PATH = "system-prompt.md";
export const SYSTEM_PROMPT_VIRTUAL_ID = "synthetic:system-prompt";
export const MAX_MEMORY_CONTENT_LENGTH = 20000;
export const MAX_MEMORY_PATH_LENGTH = 180;

export function isProtectedMemoryPath(path: string): boolean {
  return PROTECTED_MEMORY_PATHS.has(path);
}

export function isAutoloadMemoryPath(path: string): boolean {
  return AUTOLOAD_MEMORY_PATHS.has(path);
}

export function isSyntheticMemoryFileId(id: string): boolean {
  return id.startsWith("synthetic:");
}

export function normalizeMemoryPath(input: string): string {
  const path = input
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+/g, "/");

  if (!path || path.length > MAX_MEMORY_PATH_LENGTH) {
    throw new Error("invalid_path");
  }
  if (!path.endsWith(".md")) {
    throw new Error("path_must_be_markdown");
  }

  const parts = path.split("/");
  if (
    parts.some(
      (part) =>
        !part ||
        part === "." ||
        part === ".." ||
        part.length > 80 ||
        /[\u0000-\u001f]/.test(part),
    )
  ) {
    throw new Error("invalid_path");
  }

  return path;
}

export function titleFromMemoryPath(path: string): string {
  const fileName = path.split("/").pop() ?? path;
  return fileName
    .replace(/\.md$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function memoryPreview(content: string, max = 180): string {
  const preview = content
    .replace(/^#+\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  return preview.length > max ? `${preview.slice(0, max - 1)}…` : preview;
}

export function buildStarterMemoryFiles(
  profile: UserProfileRow | null,
  facts: UserFactRow[],
): Array<{
  path: string;
  title: string;
  content: string;
  autoload: boolean;
  source: "migration";
}> {
  return [
    {
      path: "identity.md",
      title: "Identity",
      content: buildIdentityMarkdown(profile),
      autoload: true,
      source: "migration",
    },
    {
      path: "facts.md",
      title: "Facts",
      content: buildFactsMarkdown(facts),
      autoload: true,
      source: "migration",
    },
  ];
}

function buildIdentityMarkdown(profile: UserProfileRow | null): string {
  const lines = ["# Identity", ""];

  if (profile?.bio?.trim()) {
    lines.push("## Bio", "", profile.bio.trim(), "");
  }

  const profileLines: string[] = [];
  if (profile?.platforms?.length) {
    profileLines.push(`- Platforms: ${profile.platforms.join(", ")}`);
  }
  if (profile?.niche_primary) {
    profileLines.push(`- Primary niche: ${profile.niche_primary}`);
  }
  if (profile?.niche_secondary?.length) {
    profileLines.push(`- Secondary niches: ${profile.niche_secondary.join(", ")}`);
  }
  if (profile?.channel_pitch?.trim()) {
    profileLines.push(`- Channel pitch: ${profile.channel_pitch.trim()}`);
  }
  if (profile?.audience_stage) {
    profileLines.push(
      `- Audience stage: ${AUDIENCE_LABEL[profile.audience_stage] ?? profile.audience_stage}`,
    );
  }
  if (profile?.primary_goal) {
    profileLines.push(
      `- Primary goal: ${GOAL_LABEL[profile.primary_goal] ?? profile.primary_goal}`,
    );
  }

  if (profileLines.length > 0) {
    lines.push("## Profile", "", ...profileLines, "");
  }

  if (lines.length === 2) {
    lines.push(
      "Use this file for durable context about who the creator is, what they post, who they serve, and how they want to sound.",
      "",
    );
  }

  return lines.join("\n").trimEnd();
}

function buildFactsMarkdown(facts: UserFactRow[]): string {
  const lines = [
    "# Facts",
    "",
    "Stable things the agent has learned about the creator. One bullet per fact.",
  ];

  if (facts.length > 0) {
    lines.push("");
    for (const fact of facts) {
      lines.push(`- ${fact.content.trim()}`);
    }
  }

  return lines.join("\n");
}
