import { createClient } from "@/lib/supabase/server";
import type { ChatRow, MessageRow, UserFactRow, UserProfileRow } from "./types";

export async function listChats(userId: string): Promise<ChatRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chats")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return data ?? [];
}

export async function getChat(
  chatId: string,
  userId: string,
): Promise<ChatRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chats")
    .select("*")
    .eq("id", chatId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getMessages(chatId: string): Promise<MessageRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createChat(userId: string): Promise<ChatRow> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chats")
    .insert({ user_id: userId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function appendMessage(
  chatId: string,
  role: "user" | "assistant",
  content: string,
): Promise<MessageRow> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({ chat_id: chatId, role, content })
    .select()
    .single();

  if (error) throw error;

  await supabase
    .from("chats")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", chatId);

  return data;
}

export async function addChatUsage(
  chatId: string,
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
  },
): Promise<void> {
  if (
    usage.inputTokens === 0 &&
    usage.outputTokens === 0 &&
    usage.cacheReadTokens === 0 &&
    usage.cacheCreationTokens === 0
  ) {
    return;
  }

  const supabase = await createClient();
  const { data: current, error: readError } = await supabase
    .from("chats")
    .select(
      "input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens",
    )
    .eq("id", chatId)
    .single();

  if (readError) throw readError;

  const { error } = await supabase
    .from("chats")
    .update({
      input_tokens: (current?.input_tokens ?? 0) + usage.inputTokens,
      output_tokens: (current?.output_tokens ?? 0) + usage.outputTokens,
      cache_read_tokens:
        (current?.cache_read_tokens ?? 0) + usage.cacheReadTokens,
      cache_creation_tokens:
        (current?.cache_creation_tokens ?? 0) + usage.cacheCreationTokens,
    })
    .eq("id", chatId);

  if (error) throw error;
}

export async function setChatTitle(
  chatId: string,
  title: string,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("chats")
    .update({ title })
    .eq("id", chatId);

  if (error) throw error;
}

export async function getUserProfile(
  userId: string,
): Promise<UserProfileRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertUserProfile(
  userId: string,
  bio: string,
): Promise<UserProfileRow> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .upsert({ user_id: userId, bio, updated_at: new Date().toISOString() })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function listUserFacts(userId: string): Promise<UserFactRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_facts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function addUserFact(
  userId: string,
  content: string,
): Promise<UserFactRow> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_facts")
    .insert({ user_id: userId, content })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteUserFact(
  userId: string,
  factId: string,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_facts")
    .delete()
    .eq("id", factId)
    .eq("user_id", userId);

  if (error) throw error;
}
