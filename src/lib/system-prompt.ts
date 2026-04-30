import type { ModelMessage } from "ai";
import type { DraftRow, SignalRow } from "@/lib/db/types";

export const DEFAULT_ASSISTANT_NAME = "Shortform Studio";

const CORE_INSTRUCTIONS = `You are a LinkedIn ghostwriter editing the active draft in the user's voice.

Keep the interaction simple:
- Ask clarifying questions when the request is underspecified.
- Use the creator profile and active draft context when they are available.
- Keep responses practical, direct, and easy to adapt.
- Prefer updating the active draft with the update_draft tool when the user asks for a rewrite or edit.
- Do not mention video queues, saved memory files, or provider internals.`;

type CreatorProfile = {
  niche: string | null;
  voice_notes: string | null;
};

type UserContext = {
  creatorProfile?: CreatorProfile | null;
  activeDraft?: DraftRow | null;
  activeDraftSignals?: ActiveDraftSignal[];
};

type ActiveDraftSignal = SignalRow & {
  sourceHandle?: string | null;
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

export function buildActiveDraftBlock(
  draft: DraftRow,
  signals: ActiveDraftSignal[],
): string {
  const signalLines = signals.map((signal) => {
    const handle = normalizeHandle(signal.sourceHandle);
    return `- ${handle}: ${readSignalText(signal)}`;
  });

  return [
    `<active_draft id="${draft.id}">`,
    "Current body:",
    "```",
    draft.body,
    "```",
    "Source signals:",
    signalLines.length > 0 ? signalLines.join("\n") : "- none linked",
    "</active_draft>",
  ].join("\n");
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

  if (user.activeDraft) {
    messages.push({
      role: "system",
      content: buildActiveDraftBlock(
        user.activeDraft,
        user.activeDraftSignals ?? [],
      ),
    });
  }

  return messages;
}

export function formatRelativeTime(date: string | Date): string {
  const then = date instanceof Date ? date : new Date(date);
  const diffMs = Date.now() - then.getTime();
  if (!Number.isFinite(diffMs)) return "";
  if (diffMs < 45_000) return "just now";

  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.round(months / 12);
  return `${years}y ago`;
}

function normalizeHandle(handle: string | null | undefined) {
  if (!handle) return "@unknown";
  return handle.startsWith("@") ? handle : `@${handle}`;
}

function readSignalText(signal: SignalRow) {
  const rawText = signal.raw.text;
  if (typeof rawText === "string" && rawText.trim()) return rawText.trim();
  if (signal.summary?.trim()) return signal.summary.trim();
  return signal.url;
}
