import { createClient } from "@/lib/supabase/server";
import { decrypt, encrypt } from "@/lib/crypto";
import {
  defaultModel,
  isModelForProvider,
  isProviderId,
  type ProviderId,
} from "@/lib/providers";
import type {
  ChatRow,
  MessageRow,
  OnboardingProfileInput,
  ProviderKeyMetaRow,
  UserFactRow,
  UserProfileRow,
  VideoRow,
  VideoStatus,
} from "./types";

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
  const { error } = await supabase.rpc("add_chat_usage", {
    p_chat_id: chatId,
    p_input: usage.inputTokens,
    p_output: usage.outputTokens,
    p_cache_read: usage.cacheReadTokens,
    p_cache_creation: usage.cacheCreationTokens,
  });

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

/**
 * Sets the chat title only when the chat currently has no title (NULL or empty
 * string). Multiple concurrent calls are safe — the last-writer-wins race is
 * acceptable since they all compute the same first-message title.
 */
export async function setChatTitleIfEmpty(
  chatId: string,
  title: string,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("chats")
    .update({ title })
    .eq("id", chatId)
    .or("title.is.null,title.eq.");

  if (error) throw error;
}

export async function renameChat(
  chatId: string,
  userId: string,
  title: string,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("chats")
    .update({ title })
    .eq("id", chatId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function deleteChat(
  chatId: string,
  userId: string,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("chats")
    .delete()
    .eq("id", chatId)
    .eq("user_id", userId);

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
  patch: string | OnboardingProfileInput,
): Promise<UserProfileRow> {
  const supabase = await createClient();
  const fields: Record<string, unknown> =
    typeof patch === "string" ? { bio: patch } : { ...patch };

  const { data, error } = await supabase
    .from("user_profiles")
    .upsert({
      user_id: userId,
      ...fields,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function markOnboarded(userId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_profiles")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("user_id", userId);

  if (error) throw error;
}

export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("onboarded_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data?.onboarded_at);
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

export async function listVideos(userId: string): Promise<VideoRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("videos")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createVideo(
  userId: string,
  input: {
    chatId?: string;
    title: string;
    hook?: string;
    script?: string;
  },
): Promise<VideoRow> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("videos")
    .insert({
      user_id: userId,
      chat_id: input.chatId,
      title: input.title,
      hook: input.hook ?? "",
      script: input.script ?? "",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateVideo(
  userId: string,
  videoId: string,
  patch: {
    title?: string;
    hook?: string;
    script?: string;
    status?: VideoStatus;
  },
): Promise<VideoRow | null> {
  const now = new Date().toISOString();
  const updates: {
    title?: string;
    hook?: string;
    script?: string;
    status?: VideoStatus;
    updated_at: string;
  } = {
    updated_at: now,
  };

  if (patch.title !== undefined) updates.title = patch.title;
  if (patch.hook !== undefined) updates.hook = patch.hook;
  if (patch.script !== undefined) updates.script = patch.script;
  if (patch.status !== undefined) updates.status = patch.status;

  const supabase = await createClient();

  // Apply main fields first.
  const { error: updateError } = await supabase
    .from("videos")
    .update(updates)
    .eq("id", videoId)
    .eq("user_id", userId);

  if (updateError) throw updateError;

  // filmed_at is set only on the first transition into "filmed" (filmed_at IS
  // NULL), so double-updates don't overwrite the original timestamp. Clearing
  // filmed_at happens immediately when status moves away from "filmed".
  if (patch.status === "filmed") {
    await supabase
      .from("videos")
      .update({ filmed_at: now })
      .eq("id", videoId)
      .eq("user_id", userId)
      .is("filmed_at", null);
  } else if (patch.status !== undefined) {
    await supabase
      .from("videos")
      .update({ filmed_at: null })
      .eq("id", videoId)
      .eq("user_id", userId);
  }

  const { data, error } = await supabase
    .from("videos")
    .select()
    .eq("id", videoId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function deleteVideo(
  userId: string,
  videoId: string,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("videos")
    .delete()
    .eq("id", videoId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function listProviderKeyMeta(
  userId: string,
): Promise<ProviderKeyMetaRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_provider_keys")
    .select("provider, last4, updated_at")
    .eq("user_id", userId);

  if (error) throw error;
  return data ?? [];
}

export async function getDecryptedProviderKey(
  userId: string,
  provider: ProviderId,
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_provider_keys")
    .select("ciphertext, iv, auth_tag")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const ciphertext = bytesFromSupabase(data.ciphertext);
  const iv = bytesFromSupabase(data.iv);
  const authTag = bytesFromSupabase(data.auth_tag);

  return decrypt({ ciphertext, iv, authTag });
}

export async function setProviderKey(
  userId: string,
  provider: ProviderId,
  plaintext: string,
): Promise<ProviderKeyMetaRow> {
  const trimmed = plaintext.trim();
  if (!trimmed) throw new Error("empty key");

  const blob = encrypt(trimmed);
  const last4 = trimmed.slice(-4);
  const updatedAt = new Date().toISOString();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_provider_keys")
    .upsert({
      user_id: userId,
      provider,
      ciphertext: bytesToSupabase(blob.ciphertext),
      iv: bytesToSupabase(blob.iv),
      auth_tag: bytesToSupabase(blob.authTag),
      last4,
      updated_at: updatedAt,
    })
    .select("provider, last4, updated_at")
    .single();

  if (error) throw error;
  return data;
}

export async function clearProviderKey(
  userId: string,
  provider: ProviderId,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_provider_keys")
    .delete()
    .eq("user_id", userId)
    .eq("provider", provider);

  if (error) throw error;
}

export async function getActiveModel(
  userId: string,
): Promise<{ provider: ProviderId; model: string }> {
  const profile = await getUserProfile(userId);
  const fallbackProvider: ProviderId = "anthropic";
  const provider = isProviderId(profile?.active_provider)
    ? profile.active_provider
    : fallbackProvider;
  const candidateModel = profile?.active_model ?? "";
  const model = isModelForProvider(provider, candidateModel)
    ? candidateModel
    : defaultModel(provider);
  return { provider, model };
}

export async function setActiveModel(
  userId: string,
  provider: ProviderId,
  model: string,
): Promise<{ provider: ProviderId; model: string }> {
  if (!isModelForProvider(provider, model)) {
    throw new Error(`model ${model} not in catalogue for ${provider}`);
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_profiles")
    .upsert({
      user_id: userId,
      active_provider: provider,
      active_model: model,
      updated_at: new Date().toISOString(),
    })
    .select("active_provider, active_model")
    .single();

  if (error) throw error;
  return { provider, model };
}

// Supabase JS encodes `bytea` columns as `\x...` hex strings on read and
// accepts the same form on write.
function bytesFromSupabase(value: unknown): Buffer {
  if (typeof value === "string") {
    if (value.startsWith("\\x")) {
      return Buffer.from(value.slice(2), "hex");
    }
    // Fallback: assume base64.
    return Buffer.from(value, "base64");
  }
  if (value instanceof Uint8Array) {
    return Buffer.from(value);
  }
  throw new Error("unexpected bytea encoding");
}

function bytesToSupabase(buf: Buffer): string {
  return `\\x${buf.toString("hex")}`;
}
