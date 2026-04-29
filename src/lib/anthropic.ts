import type { ModelMessage } from "ai";
import { getPatternLibrary } from "@/lib/patterns/library";
import { AUDIENCE_LABEL, GOAL_LABEL } from "@/lib/labels";
import type {
  AudienceStage,
  MemoryFileRow,
  PrimaryGoal,
} from "@/lib/db/types";

export const MODEL_ID = "claude-sonnet-4-6";

export function getCoreInstructions(): string {
  return CORE_INSTRUCTIONS;
}

export const DEFAULT_ASSISTANT_NAME = "Shortform Studio";

const CORE_INSTRUCTIONS = `You are Shortform Studio, an expert advisor for short-form video creators.

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
- The creator's durable memory is organized as markdown files.
- identity.md (who they are) and facts.md (stable things you've learned about them) are autoloaded into every chat.
- Use list_memory_files and read_memory_file for any other files the creator has created.
- When the creator tells you something stable about themselves, their audience, offer, platforms, content style, constraints, wins, or failures, append it to facts.md with append_memory_file.
- Keep facts.md as one flat list of bullets. Do not create a facts/ subfolder or split facts across files.
- identity.md and facts.md cannot be deleted or renamed. You can rewrite their content with upsert_memory_file or add to facts.md with append_memory_file.
- Do NOT save ephemeral chat state, one-off questions, or duplicate information.
- You do not need to ask permission before updating memory when the detail is clearly stable.
- When the creator lands on a specific video idea, call create_video with a short working title and any hook/script language discussed so far.
- As you refine the hook or full script with them, call update_video with the id.
- Don't ask permission before saving a video idea. Save it and mention it briefly, for example "saved this to your queue."
- Use status=ready only when both the hook and script are fleshed out.
- Never set status=filmed. The user toggles that themselves.`;

type ActiveVideoSummary = {
  id: string;
  title: string | null;
  status: string;
  hook: string | null;
  script: string | null;
};

type UserContext = {
  memoryFiles: MemoryFileRow[];
  assistantName?: string | null;
  assistantPersona?: string | null;
  creatorProfile?: CreatorProfile | null;
  activeVideos?: ActiveVideoSummary[];
};

function buildActiveVideosBlock(videos: ActiveVideoSummary[]): string {
  const intro =
    videos.length === 1
      ? "The creator currently has this video open in their editor. Treat it as the focal context for this chat unless they say otherwise. Call the `get_video_details` tool if you need the full latest state."
      : "The creator currently has multiple videos open in their editor. They may be switching between them in this conversation. Ask which video they want to focus on if it's ambiguous, or use `get_video_details` to fetch the full latest state of any of them.";

  const blocks = videos.map((video) => {
    const lines = [
      `<active_video id="${video.id}" status="${video.status}">`,
      `title: ${video.title ?? "(untitled)"}`,
    ];
    if (video.hook) lines.push(`hook: ${truncate(video.hook, 280)}`);
    if (video.script) lines.push(`script_preview: ${truncate(video.script, 500)}`);
    lines.push(`</active_video>`);
    return lines.join("\n");
  });

  return `${intro}\n\n${blocks.join("\n\n")}`;
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max).trimEnd()}…`;
}

function buildPersonaBlock(
  name: string | null | undefined,
  persona: string | null | undefined,
): string | null {
  const trimmedName = name?.trim();
  const trimmedPersona = persona?.trim();
  if (!trimmedName && !trimmedPersona) return null;

  const lines: string[] = [];
  if (trimmedName) {
    lines.push(
      `The creator has named you "${trimmedName}". Refer to yourself by that name when self-referential ("I'm ${trimmedName}", signing off, etc.). It overrides the default "Shortform Studio" identity.`,
    );
  }
  if (trimmedPersona) {
    lines.push(
      `Adopt this personality and voice in every reply. Stay in character without being theatrical:\n${trimmedPersona}`,
    );
  }
  return lines.join("\n\n");
}

type CreatorProfile = {
  platforms: string[];
  niche_primary: string | null;
  niche_secondary: string[];
  channel_pitch: string | null;
  audience_stage: AudienceStage | null;
  primary_goal: PrimaryGoal | null;
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

  if (user.creatorProfile) {
    messages.push({
      role: "system",
      content: buildCreatorProfileBlock(user.creatorProfile),
    });
  }

  const personaBlock = buildPersonaBlock(user.assistantName, user.assistantPersona);
  if (personaBlock) {
    messages.push({
      role: "system",
      content: personaBlock,
    });
  }

  if (user.activeVideos && user.activeVideos.length > 0) {
    messages.push({
      role: "system",
      content: buildActiveVideosBlock(user.activeVideos),
    });
  }

  if (user.memoryFiles.length > 0) {
    messages.push({
      role: "system",
      content: [
        "Autoloaded creator memory files:",
        "",
        ...user.memoryFiles.map(
          (file) =>
            `<memory_file path="${file.path}" title="${file.title}">\n${file.content.trim()}\n</memory_file>`,
        ),
      ].join("\n"),
    });
  }

  return messages;
}
