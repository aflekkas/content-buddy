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

export type MessageRow = {
  id: string;
  chat_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export type UserProfileRow = {
  user_id: string;
  bio: string;
  updated_at: string;
};

export type UserFactRow = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
};
