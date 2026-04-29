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
  | { type: "file"; url: string; mediaType: string; filename?: string }
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

export type AudienceStage = "starting" | "growing" | "established" | "large";
export type PrimaryGoal =
  | "grow"
  | "monetize"
  | "brand"
  | "traffic"
  | "experiment";

export type UserProfileRow = {
  user_id: string;
  bio: string;
  updated_at: string;
  platforms: string[];
  niche_primary: string | null;
  niche_secondary: string[];
  channel_pitch: string | null;
  audience_stage: AudienceStage | null;
  primary_goal: PrimaryGoal | null;
  onboarded_at: string | null;
  active_provider: string;
  active_model: string;
  assistant_name: string | null;
  assistant_persona: string | null;
};

export type ProviderKeyMetaRow = {
  provider: ProviderId;
  last4: string;
  updated_at: string;
};

export type StarterPromptIcon =
  | "target"
  | "lightbulb"
  | "flame"
  | "users"
  | "message"
  | "video"
  | "sparkles"
  | "zap";

export type StarterPrompt = {
  text: string;
  icon: StarterPromptIcon;
};

export type StarterPromptRow = {
  user_id: string;
  prompts: StarterPrompt[];
  generated_at: string;
  source_provider: string;
  source_model: string;
  created_at: string;
  updated_at: string;
};

export type OnboardingProfileInput = {
  bio?: string;
  platforms?: string[];
  niche_primary?: string | null;
  niche_secondary?: string[];
  channel_pitch?: string | null;
  audience_stage?: AudienceStage | null;
  primary_goal?: PrimaryGoal | null;
  assistant_name?: string | null;
  assistant_persona?: string | null;
};

export type UserFactRow = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
};

export type MemoryFileSource = "user" | "agent" | "migration";

export type MemoryFileRow = {
  id: string;
  user_id: string;
  path: string;
  title: string;
  content: string;
  autoload: boolean;
  source: MemoryFileSource;
  created_at: string;
  updated_at: string;
};

export type MessagesPage = {
  messages: MessageRow[];
  hasMore: boolean;
};

export type VideoStatus = "idea" | "ready" | "filmed";

export type HookSource = "manual" | "chat" | "video";

export type HookRow = {
  id: string;
  user_id: string;
  text: string;
  notes: string;
  tags: string[];
  source: HookSource;
  source_chat_id: string | null;
  source_video_id: string | null;
  created_at: string;
  updated_at: string;
};

export type VideoRow = {
  id: string;
  user_id: string;
  chat_id: string | null;
  title: string;
  hook: string;
  script: string;
  status: VideoStatus;
  created_at: string;
  updated_at: string;
  filmed_at: string | null;
};
