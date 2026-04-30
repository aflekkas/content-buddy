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
  DraftRow,
  ExternalCredentialMetaRow,
  MessagePart,
  MessageRow,
  MessagesPage,
  MonitoredSourceRow,
  OnboardingProfileInput,
  ProviderKeyMetaRow,
  SignalRow,
  UserProfileRow,
} from "./types";

type ExternalCredentialKind = "apify";
type SourceKind = MonitoredSourceRow["kind"];
type SignalStatus = SignalRow["status"];

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

export async function getUserProfileForCron(
  userId: string,
): Promise<UserProfileRow | null> {
  const supabase = createAdminClient();
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
  patch: OnboardingProfileInput,
): Promise<UserProfileRow> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_profiles")
    .upsert({
      user_id: userId,
      ...patch,
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

export const listExternalCredentialMeta = cache(
  async (userId: string): Promise<ExternalCredentialMetaRow[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("user_external_credentials")
      .select("kind, last4, updated_at")
      .eq("user_id", userId);

    if (error) throw error;
    return (data ?? []).filter((row) => row.kind === "apify");
  },
);

export async function getDecryptedExternalCredential(
  userId: string,
  kind: ExternalCredentialKind,
): Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("user_external_credentials")
    .select("ciphertext, iv, auth_tag")
    .eq("user_id", userId)
    .eq("kind", kind)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const ciphertext = bytesFromSupabase(data.ciphertext);
  const iv = bytesFromSupabase(data.iv);
  const authTag = bytesFromSupabase(data.auth_tag);

  return decrypt({ ciphertext, iv, authTag });
}

export async function setExternalCredential(
  userId: string,
  kind: ExternalCredentialKind,
  plaintext: string,
): Promise<void> {
  const trimmed = plaintext.trim();
  if (!trimmed) throw new Error("empty credential");

  const blob = encrypt(trimmed);
  const last4 = trimmed.slice(-4);
  const updatedAt = new Date().toISOString();

  const supabase = await createClient();
  const { error } = await supabase.from("user_external_credentials").upsert({
    user_id: userId,
    kind,
    ciphertext: bytesToSupabase(blob.ciphertext),
    iv: bytesToSupabase(blob.iv),
    auth_tag: bytesToSupabase(blob.authTag),
    last4,
    updated_at: updatedAt,
  });

  if (error) throw error;
}

export async function clearExternalCredential(
  userId: string,
  kind: ExternalCredentialKind,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_external_credentials")
    .delete()
    .eq("user_id", userId)
    .eq("kind", kind);

  if (error) throw error;
}

export async function listSources(
  userId: string,
): Promise<MonitoredSourceRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("monitored_sources")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getSource(
  userId: string,
  id: string,
): Promise<MonitoredSourceRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("monitored_sources")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createSource(
  userId: string,
  input: {
    kind: SourceKind;
    handle: string;
    topic_tags?: string[];
    poll_interval_hours?: number;
  },
): Promise<MonitoredSourceRow> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("monitored_sources")
    .insert({
      user_id: userId,
      kind: input.kind,
      handle: input.handle,
      topic_tags: input.topic_tags ?? [],
      poll_interval_hours: input.poll_interval_hours ?? 24,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSource(
  userId: string,
  id: string,
  patch: Partial<
    Pick<
      MonitoredSourceRow,
      | "topic_tags"
      | "poll_interval_hours"
      | "last_polled_at"
      | "last_synthesized_at"
    >
  >,
): Promise<MonitoredSourceRow> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("monitored_sources")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSource(userId: string, id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("monitored_sources")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);

  if (error) throw error;
}

export async function listAllSourcesForCron(): Promise<MonitoredSourceRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("monitored_sources")
    .select("*")
    .order("user_id", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function listSignals(
  userId: string,
  opts?: {
    limit?: number;
    status?: SignalStatus;
    sourceId?: string;
    postedAfter?: string;
  },
): Promise<SignalRow[]> {
  const limit = Math.min(Math.max(opts?.limit ?? 100, 1), 500);
  const supabase = createAdminClient();
  let query = supabase
    .from("signals")
    .select("*")
    .eq("user_id", userId)
    .order("posted_at", { ascending: false })
    .limit(limit);

  if (opts?.status) query = query.eq("status", opts.status);
  if (opts?.sourceId) query = query.eq("source_id", opts.sourceId);
  if (opts?.postedAfter) query = query.gt("posted_at", opts.postedAfter);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getSignal(
  userId: string,
  id: string,
): Promise<SignalRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("signals")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listSignalsByIds(
  userId: string,
  ids: string[],
): Promise<SignalRow[]> {
  if (ids.length === 0) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("signals")
    .select("*")
    .eq("user_id", userId)
    .in("id", ids);

  if (error) throw error;
  return data ?? [];
}

export async function insertSignals(
  userId: string,
  sourceId: string,
  posts: Array<
    Omit<
      SignalRow,
      | "id"
      | "user_id"
      | "source_id"
      | "fetched_at"
      | "summary"
      | "relevance_score"
      | "status"
    >
  >,
): Promise<SignalRow[]> {
  if (posts.length === 0) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("signals")
    .upsert(
      posts.map((post) => ({
        user_id: userId,
        source_id: sourceId,
        external_id: post.external_id,
        url: post.url,
        posted_at: post.posted_at,
        raw: post.raw,
      })),
      { onConflict: "user_id,external_id", ignoreDuplicates: true },
    )
    .select();

  if (error) throw error;
  return data ?? [];
}

export async function updateSignal(
  userId: string,
  id: string,
  patch: Partial<Pick<SignalRow, "summary" | "relevance_score" | "status">>,
): Promise<SignalRow> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("signals")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function listDrafts(userId: string): Promise<DraftRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("drafts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getDraft(
  userId: string,
  id: string,
): Promise<DraftRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("drafts")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createDraft(
  userId: string,
  input: { signal_ids?: string[]; body: string; chat_id?: string | null },
): Promise<DraftRow> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("drafts")
    .insert({
      user_id: userId,
      signal_ids: input.signal_ids ?? [],
      body: input.body,
      chat_id: input.chat_id ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateDraft(
  userId: string,
  id: string,
  patch: Partial<Pick<DraftRow, "body" | "status" | "copied_at" | "chat_id">>,
): Promise<DraftRow> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("drafts")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteDraft(userId: string, id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("drafts")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);

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
