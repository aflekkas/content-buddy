import { unstable_cache } from "next/cache";
import { cache } from "react";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { decrypt, encrypt } from "@/lib/crypto";
import {
  defaultModel,
  isModelForProvider,
  isProviderId,
  type ProviderId,
} from "@/lib/providers";
import type {
  ChatRow,
  MessagePart,
  MessageRow,
  MessagesPage,
  OnboardingProfileInput,
  ProviderKeyMetaRow,
  UserProfileRow,
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

export async function getMessages(
  chatId: string,
  opts?: { limit?: number; before?: string },
): Promise<MessagesPage> {
  const limit = Math.min(Math.max(opts?.limit ?? 50, 1), 100);
  const before = opts?.before;

  const supabase = await createClient();
  let query = supabase
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  if (hasMore) rows.pop();
  rows.reverse();

  return { messages: rows, hasMore };
}

export function getCachedMessages(
  chatId: string,
  opts?: { limit?: number; before?: string },
): Promise<MessagesPage> {
  const limit = Math.min(Math.max(opts?.limit ?? 50, 1), 100);
  const before = opts?.before;
  const cursorKey = before ?? "latest";

  return unstable_cache(
    async (id: string, lim: number, cur: string) => {
      const beforeVal = cur === "latest" ? undefined : cur;
      const supabase = createAdminClient();
      let query = supabase
        .from("messages")
        .select("*")
        .eq("chat_id", id)
        .order("created_at", { ascending: false })
        .limit(lim + 1);

      if (beforeVal) {
        query = query.lt("created_at", beforeVal);
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows = data ?? [];
      const hasMore = rows.length > lim;
      if (hasMore) rows.pop();
      rows.reverse();

      return { messages: rows, hasMore } as MessagesPage;
    },
    ["chat-messages", chatId, String(limit), cursorKey],
    {
      tags: before === undefined ? [`chat:${chatId}:messages`] : [],
    },
  )(chatId, limit, cursorKey);
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

export async function appendMessageWithParts(
  chatId: string,
  role: "user" | "assistant",
  parts: MessagePart[],
): Promise<MessageRow> {
  const content = parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("")
    .trim();

  const supabase = await createClient();
  const [insertResult] = await Promise.all([
    supabase
      .from("messages")
      .insert({ chat_id: chatId, role, content, parts })
      .select()
      .single(),
    supabase
      .from("chats")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", chatId),
  ]);

  if (insertResult.error) throw insertResult.error;
  return insertResult.data;
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
    .upsert({
      user_id: userId,
      onboarded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;
}

export const hasCompletedOnboarding = cache(
  async (userId: string): Promise<boolean> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("user_profiles")
      .select("onboarded_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return Boolean(data?.onboarded_at);
  },
);

export const listProviderKeyMeta = cache(
  async (userId: string): Promise<ProviderKeyMetaRow[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("user_provider_keys")
      .select("provider, last4, updated_at")
      .eq("user_id", userId);

    if (error) throw error;
    return (data ?? []).filter((row) => row.provider === "openai");
  },
);

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

export const getActiveModel = cache(
  async (
    userId: string,
  ): Promise<{ provider: ProviderId; model: string }> => {
    const profile = await getUserProfile(userId);
    const provider: ProviderId = isProviderId(profile?.active_provider)
      ? profile.active_provider
      : "openai";
    const candidateModel = profile?.active_model ?? "";
    const model = isModelForProvider(provider, candidateModel)
      ? candidateModel
      : defaultModel(provider);
    return { provider, model };
  },
);

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

export type SearchChatHit = {
  chat_id: string;
  title: string | null;
  updated_at: string;
  snippet: string;
  matched_at: string;
};

export async function searchChats(
  query: string,
  limit = 20,
): Promise<SearchChatHit[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_chats", {
    p_query: trimmed,
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as SearchChatHit[];
}

function bytesFromSupabase(value: unknown): Buffer {
  if (typeof value === "string") {
    if (value.startsWith("\\x")) {
      return Buffer.from(value.slice(2), "hex");
    }
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
