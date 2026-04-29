export type Niche = {
  id: string;
  label: string;
  emoji: string;
};

export const NICHES: Niche[] = [
  { id: "fitness", label: "Fitness", emoji: "💪" },
  { id: "finance", label: "Finance", emoji: "💸" },
  { id: "beauty", label: "Beauty", emoji: "💄" },
  { id: "gaming", label: "Gaming", emoji: "🎮" },
  { id: "food", label: "Food", emoji: "🍳" },
  { id: "tech", label: "Tech", emoji: "💻" },
  { id: "comedy", label: "Comedy", emoji: "😂" },
  { id: "education", label: "Education", emoji: "📚" },
  { id: "lifestyle", label: "Lifestyle", emoji: "✨" },
  { id: "music", label: "Music", emoji: "🎧" },
  { id: "sports", label: "Sports", emoji: "🏀" },
  { id: "travel", label: "Travel", emoji: "✈️" },
  { id: "business", label: "Business", emoji: "📈" },
  { id: "fashion", label: "Fashion", emoji: "👗" },
  { id: "pets", label: "Pets", emoji: "🐶" },
  { id: "other", label: "Something else", emoji: "🌀" },
];

export const NICHE_BY_ID = Object.fromEntries(
  NICHES.map((n) => [n.id, n]),
) as Record<string, Niche>;

export const NICHE_IDS = NICHES.map((n) => n.id);

export type OnboardingPlatform = "tiktok" | "reels" | "shorts" | "youtube_long";

export const ONBOARDING_PLATFORMS: {
  id: OnboardingPlatform;
  label: string;
  hint: string;
}[] = [
  { id: "tiktok", label: "TikTok", hint: "Short-form" },
  { id: "reels", label: "Reels", hint: "Instagram short-form" },
  { id: "shorts", label: "Shorts", hint: "YouTube short-form" },
  { id: "youtube_long", label: "YouTube long-form", hint: "10+ min videos" },
];

export const ONBOARDING_PLATFORM_IDS = ONBOARDING_PLATFORMS.map((p) => p.id);
