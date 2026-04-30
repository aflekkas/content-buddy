import type { ModelMessage } from "ai";

export const DEFAULT_ASSISTANT_NAME = "Shortform Studio";

const CORE_INSTRUCTIONS = `You are Shortform Studio, a concise assistant for turning creator context into clear, useful writing.

For this transition stage, keep the interaction simple:
- Ask clarifying questions when the request is underspecified.
- Use the creator profile when it is available.
- Keep responses practical, direct, and easy to adapt.
- Do not mention video queues, saved memory files, or provider internals.`;

type CreatorProfile = {
  niche: string | null;
  voice_notes: string | null;
};

type UserContext = {
  creatorProfile?: CreatorProfile | null;
};

export function getCoreInstructions(): string {
  return CORE_INSTRUCTIONS;
}

export function buildCreatorProfileBlock(profile: CreatorProfile): string {
  const lines: string[] = [];
  const niche = profile.niche?.trim();
  const voiceNotes = profile.voice_notes?.trim();

  if (niche) lines.push(`niche: ${niche}`);
  if (voiceNotes) lines.push(`voice_notes: ${voiceNotes}`);

  if (lines.length === 0) return "";
  return `<creator_profile>\n${lines.join("\n")}\n</creator_profile>`;
}

export function buildSystemMessages(user: UserContext): ModelMessage[] {
  const messages: ModelMessage[] = [
    {
      role: "system",
      content: CORE_INSTRUCTIONS,
    },
  ];

  if (user.creatorProfile) {
    const profileBlock = buildCreatorProfileBlock(user.creatorProfile);
    if (profileBlock) {
      messages.push({ role: "system", content: profileBlock });
    }
  }

  return messages;
}
