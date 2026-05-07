import type { ProviderId } from "@/lib/providers";

export type ActiveModel = { provider: ProviderId; model: string };

export type ChatRow = {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_creation_tokens: number;
};

export type MessagePart =
  | { type: "text"; text: string }
  | { type: "reasoning"; text: string }
  | {
      type: "file";
      url: string;
      mediaType: string;
      filename?: string;
      path?: string;
    }
  | {
      type: `tool-${string}`;
      toolCallId?: string;
      state?: string;
      input?: unknown;
      output?: unknown;
      errorText?: string;
    };

export type MessageRow = {
  id: string;
  chat_id: string;
  role: "user" | "assistant";
  content: string;
  parts: MessagePart[] | null;
  created_at: string;
};

export const POST_TYPES = [
  "hot_take",
  "story",
  "framework",
  "teardown",
  "listicle",
  "contrarian",
  "question",
  "lesson",
] as const;

export type PostType = (typeof POST_TYPES)[number];

export type UserProfileRow = {
  user_id: string;
  updated_at: string;
  niche: string | null;
  voice_notes: string | null;
  voice_samples: string | null;
  target_audience: string | null;
  post_goal: string | null;
  formality: number;
  elaboration: number;
  length_pref: number;
  preferred_post_types: PostType[];
  avoid_phrases: string | null;
  include_links: boolean;
  active_provider_id: string;
  active_model_id: string;
  voice_dna: string | null;
};

export type UserMemoryRow = {
  id: string;
  user_id: string;
  memory: string;
  source: "user" | "agent";
  created_at: string;
  updated_at: string;
};

export type MonitoredSourceKind = "rss_feed";

export type MonitoredSourceRow = {
  id: string;
  user_id: string;
  kind: MonitoredSourceKind;
  handle: string;
  url: string | null;
  topic_tags: string[];
  poll_interval_hours: number;
  last_polled_at: string | null;
  last_synthesized_at: string | null;
  created_at: string;
};

export type SignalRow = {
  id: string;
  user_id: string;
  source_id: string;
  external_id: string;
  url: string;
  posted_at: string;
  raw: Record<string, unknown>;
  summary: string | null;
  relevance_score: number | null;
  status: "new" | "queued" | "drafted" | "dismissed";
  fetched_at: string;
};

export type DraftRow = {
  id: string;
  user_id: string;
  signal_ids: string[];
  chat_id: string | null;
  body: string;
  status: "draft" | "copied" | "posted" | "dismissed";
  post_type: PostType | null;
  copied_at: string | null;
  posted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type WritingPrefsInput = {
  target_audience?: string | null;
  post_goal?: string | null;
  formality?: number;
  elaboration?: number;
  length_pref?: number;
  preferred_post_types?: PostType[];
  avoid_phrases?: string | null;
  include_links?: boolean;
};

export type OnboardingProfileInput = {
  niche?: string | null;
  voice_notes?: string | null;
  voice_samples?: string | null;
  voice_dna?: string | null;
  active_provider_id?: string;
  active_model_id?: string;
} & WritingPrefsInput;

export type MessagesPage = {
  messages: MessageRow[];
  hasMore: boolean;
};
