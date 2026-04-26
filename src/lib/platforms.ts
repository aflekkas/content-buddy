export type PlatformId = "x" | "linkedin" | "youtube" | "instagram" | "tiktok";

export type PlatformCategory = "written" | "short-form" | "long-form";

export type Platform = {
  id: PlatformId;
  name: string;
  categories: PlatformCategory[];
};

export const PLATFORMS: Platform[] = [
  { id: "x", name: "X", categories: ["written"] },
  { id: "linkedin", name: "LinkedIn", categories: ["written"] },
  { id: "instagram", name: "Instagram", categories: ["short-form"] },
  { id: "tiktok", name: "TikTok", categories: ["short-form"] },
  { id: "youtube", name: "YouTube", categories: ["short-form", "long-form"] },
];

export const PLATFORM_CATEGORIES: Record<PlatformCategory, PlatformId[]> = {
  written: ["x", "linkedin"],
  "short-form": ["youtube", "instagram", "tiktok"],
  "long-form": ["youtube"],
};

export const PLATFORM_BY_ID: Record<PlatformId, Platform> = PLATFORMS.reduce(
  (acc, p) => {
    acc[p.id] = p;
    return acc;
  },
  {} as Record<PlatformId, Platform>,
);
