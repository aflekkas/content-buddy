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

export type UserProfileRow = {
  user_id: string;
  bio: string;
  updated_at: string;
  onboarded_at: string | null;
  active_provider: string;
  active_model: string;
  niche: string | null;
  voice_notes: string | null;
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
  | "sparkles"
  | "zap";

export type StarterPrompt = {
  text: string;
  icon: StarterPromptIcon;
};

export type OnboardingProfileInput = {
  bio?: string;
  niche?: string | null;
  voice_notes?: string | null;
};

export type MessagesPage = {
  messages: MessageRow[];
  hasMore: boolean;
};
