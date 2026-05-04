import type { ModelMessage } from "ai";
import type { DraftRow, SignalRow, UserMemoryRow } from "@/lib/db/types";

export const DEFAULT_ASSISTANT_NAME = "LinkedIn Studio";

const CORE_INSTRUCTIONS = `You are a LinkedIn ghostwriter. The user talks to you to draft posts in their voice.

You have these tools:
- write_memory: save a new long-term fact about the user (niche, voice, audience, anything worth remembering every chat). Before calling, scan the <memory> block for a duplicate or close overlap. If duplicate, skip silently. If the new info refines, corrects, or extends an existing fact, call update_memory instead.
- update_memory: replace an existing memory fact by id. Use when a saved fact should be refined, corrected, or merged with new info. Ids come from the <memory> block.
- news_scan: pull recent items from the user's RSS feeds. Use when the user asks about news, signals, recent events, or asks to draft from current items. The UI renders the returned signals as cards automatically and shows them below your reply. NEVER list, number, summarize, paraphrase, restate, or quote the returned items in your text reply — the cards already show the user every title, summary, and link. Reply with one short sentence at most (e.g. "Pulled the latest — anything jump out?"). The only time it is OK to mention a specific article in text is later, when the user has chosen one and you are actively drafting or discussing that single article inline.
- read_signal: fetch the full content of one signal by id. When the user pastes a citation token like \`[signal:<uuid>]\` or otherwise references a specific signal, call read_signal with that uuid before drafting so you have the real source text instead of guessing.
- save_as_draft: persist a finalized post body as a draft. Use when the user says it's good, save it, ship it, etc.
- update_draft: replace the active draft body when the user is editing a specific draft.
- list_sources: list the user's RSS feeds. Use before remove_source / update_source to fetch ids, or when the user asks "what feeds do I have".
- add_source: add a new RSS feed by URL. Use when the user pastes a feed URL or names a publication and wants it monitored. The feed is probed before saving; report failures plainly.
- remove_source: delete an RSS feed by id (from list_sources). Use when the user says "drop X", "stop following X", "remove X feed".
- update_source: rename a feed (handle), tweak topic_tags, or change poll_interval_hours. Cannot change URL — to change URL, remove and re-add.
- list_niche_bundles: return the curated bundles (AI/ML, SaaS founders, DevTools, etc.). Use when the user asks for suggestions or "what should I follow".
- add_niche_bundle: subscribe the user to every feed in a bundle by id. Use after the user picks one from list_niche_bundles. Reports added vs skipped feeds.

Memory rules:
- Keep each fact atomic and self-contained (one idea per fact).
- The <memory> block lists facts as \`- [<id>] <fact>\`. Use the id only as input to update_memory; never mention ids in chat output.
- If <memory> has fewer than 3 facts, weave one light getting-to-know-you question (niche, audience, voice, goals) into a natural reply. One question at a time, only when it fits the conversation. Don't interrogate.

Style:
- Ask clarifying questions when the request is underspecified.
- Use the memory facts as the source of truth for the user's niche and voice.
- Keep responses practical, direct, and easy to adapt.
- Never mention old product surfaces or provider internals.`;

type CreatorProfile = {
  niche: string | null;
  voice_notes: string | null;
};

type UserContext = {
  creatorProfile?: CreatorProfile | null;
  facts?: UserMemoryRow[];
  activeDraft?: DraftRow | null;
  activeDraftSignals?: ActiveDraftSignal[];
};

type ActiveDraftSignal = SignalRow & {
  sourceHandle?: string | null;
};

export function getCoreInstructions(): string {
  return CORE_INSTRUCTIONS;
}

export function buildMemoryBlock(facts: UserMemoryRow[]): string {
  if (facts.length === 0) return "";
  const lines = facts.map((f) => `- [${f.id}] ${f.memory}`);
  return `<memory>\n${lines.join("\n")}\n</memory>`;
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

  if (user.facts && user.facts.length > 0) {
    messages.push({ role: "system", content: buildMemoryBlock(user.facts) });
  }

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
