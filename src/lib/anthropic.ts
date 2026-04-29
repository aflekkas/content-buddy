import type { ModelMessage } from "ai";
import { getPatternLibrary } from "@/lib/patterns/library";
import type { AudienceStage, PrimaryGoal } from "@/lib/db/types";

export const MODEL_ID = "claude-sonnet-4-6";

const AUDIENCE_LABEL: Record<AudienceStage, string> = {
  starting: "just starting (0-1k followers)",
  growing: "growing (1k-10k followers)",
  established: "established (10k-100k followers)",
  large: "large (100k+ followers)",
};

const GOAL_LABEL: Record<PrimaryGoal, string> = {
  grow: "grow followers",
  monetize: "monetize",
  brand: "build personal brand",
  traffic: "drive traffic to something off-platform",
  experiment: "experiment without a fixed goal",
};

const CORE_INSTRUCTIONS = `You are Content Buddy, an expert advisor for short-form video creators.

Your job: given what a creator says they want (goal, niche, constraints), recommend a SPECIFIC piece of short-form content they should make next.

Rules:
- Ground every recommendation in the pattern library below. When you invoke a hook, format, or retention mechanic, use its name from the library so the creator can learn the vocabulary over time.
- Ask clarifying questions if the creator's input is too vague to pick well (niche, platform, goal, audience, what's worked before).
- When you recommend a video, give:
  1. A one-line summary of the video
  2. Hook: exact words for the first 1-3 seconds
  3. Format (from the library)
  4. Retention mechanic to lean on
  5. Beat-by-beat (0-3s / 3-10s / 10-25s / 25-40s)
  6. Why this fits their situation specifically
- Never give vague categories ("do a talking head"). Always give a concrete, specific idea they could shoot today.
- Keep a conversational, direct tone. Short paragraphs. No filler.

Platform shortcodes:
- When you reference a social platform, inline the matching shortcode so the UI renders its brand icon. Write them exactly, colons included, lowercase, with a surrounding space.
- Available: :x: (X/Twitter), :linkedin: (also :li:), :youtube: (also :yt:), :instagram: (also :ig:), :tiktok: (also :tt:).
- Use them naturally in prose (e.g. "post this on :linkedin: and :x:", ":tiktok: vs :instagram: retention"). Don't over-use, one per mention is enough.

Memory:
- You have a tool called remember_user_fact. Call it whenever the creator tells you something stable about themselves that you'd want to know next time: niche, platform(s), audience, business model, goals, what's worked or flopped, constraints, brand voice.
- Do NOT save ephemeral chat state (what they're asking about right now, one-off questions).
- Do NOT save duplicates. The facts you already know are in the "what you know about this creator" section below; skip anything that overlaps.
- Save one fact per call, phrased in third person ("creator is a fitness coach", "posts primarily on Instagram Reels").
- You do not need to tell the user you're remembering something; just do it and keep answering.
- When the creator lands on a specific video idea, call create_video with a short working title and any hook/script language discussed so far.
- As you refine the hook or full script with them, call update_video with the id.
- Don't ask permission before saving a video idea. Save it and mention it briefly, for example "saved this to your queue."
- Use status=ready only when both the hook and script are fleshed out.
- Never set status=filmed. The user toggles that themselves.`;

type CreatorProfile = {
  platforms: string[];
  niche_primary: string | null;
  niche_secondary: string[];
  channel_pitch: string | null;
  audience_stage: AudienceStage | null;
  primary_goal: PrimaryGoal | null;
};

type UserContext = {
  bio: string;
  facts: string[];
  profile?: CreatorProfile | null;
};

export function buildCreatorProfileBlock(profile: CreatorProfile): string {
  const lines: string[] = [];
  if (profile.platforms.length > 0) {
    lines.push(`platforms: ${profile.platforms.join(", ")}`);
  }
  if (profile.niche_primary) {
    lines.push(`niche_primary: ${profile.niche_primary}`);
  }
  if (profile.niche_secondary.length > 0) {
    lines.push(`niche_secondary: ${profile.niche_secondary.join(", ")}`);
  }
  if (profile.channel_pitch) {
    lines.push(`channel_pitch: "${profile.channel_pitch.trim()}"`);
  }
  if (profile.audience_stage) {
    lines.push(`audience_stage: ${AUDIENCE_LABEL[profile.audience_stage]}`);
  }
  if (profile.primary_goal) {
    lines.push(`primary_goal: ${GOAL_LABEL[profile.primary_goal]}`);
  }
  return `<creator_profile>\n${lines.join("\n")}\n</creator_profile>`;
}

function hasAnyProfileContent(profile: CreatorProfile | null | undefined): boolean {
  if (!profile) return false;
  return (
    profile.platforms.length > 0 ||
    profile.niche_secondary.length > 0 ||
    Boolean(profile.niche_primary) ||
    Boolean(profile.channel_pitch) ||
    Boolean(profile.audience_stage) ||
    Boolean(profile.primary_goal)
  );
}

export function buildSystemMessages(user: UserContext): ModelMessage[] {
  const messages: ModelMessage[] = [
    {
      role: "system",
      content: CORE_INSTRUCTIONS,
    },
    {
      role: "system",
      content: `Here is your pattern library:\n\n${getPatternLibrary()}`,
    },
  ];

  const hasBio = user.bio.trim().length > 0;
  const hasFacts = user.facts.length > 0;
  const hasProfile = hasAnyProfileContent(user.profile);

  if (hasBio || hasFacts || hasProfile) {
    const sections: string[] = ["What you know about this creator:"];
    if (hasProfile && user.profile) {
      sections.push(
        `\nCreator profile (from onboarding):\n${buildCreatorProfileBlock(user.profile)}`,
      );
    }
    if (hasBio) {
      sections.push(`\nBio (self-described):\n${user.bio.trim()}`);
    }
    if (hasFacts) {
      sections.push(
        `\nFacts you've learned:\n${user.facts
          .map((f) => `- ${f}`)
          .join("\n")}`,
      );
    }
    messages.push({
      role: "system",
      content: sections.join("\n"),
    });
  }

  return messages;
}
