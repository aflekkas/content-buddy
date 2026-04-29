import { unstable_cache } from "next/cache";
import { cache } from "react";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { decrypt, encrypt } from "@/lib/crypto";
import {
  buildStarterMemoryFiles,
  isAutoloadMemoryPath,
  isProtectedMemoryPath,
  memoryPreview,
  normalizeMemoryPath,
  titleFromMemoryPath,
} from "@/lib/memory";
import {
  defaultModel,
  isModelForProvider,
  isProviderId,
  type ProviderId,
} from "@/lib/providers";
import type {
  ChatRow,
  HookRow,
  HookSource,
  MemoryFileRow,
  MemoryFileSource,
  MessageRow,
  MessagesPage,
  OnboardingProfileInput,
  ProviderKeyMetaRow,
  StarterPrompt,
  StarterPromptIcon,
  StarterPromptRow,
  UserFactRow,
  UserProfileRow,
  VideoRow,
  VideoStatus,
} from "./types";

export type StarterPromptRefreshCandidate = {
  userId: string;
  provider: ProviderId;
  model: string;
};

export type StarterPromptContext = {
  profile: UserProfileRow | null;
  memoryFiles: MemoryFileRow[];
  recentMessages: string[];
};

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

/**
 * Cached variant of getMessages. Uses an admin client (bypasses RLS) so the
 * cached body is cookie-free and deterministic. Auth is enforced upstream by
 * getChat() before this is called.
 *
 * Cache strategy:
 * - Latest page (before undefined): tagged `chat:<id>:messages` — busted by appendMessage.
 * - Past pages (before set): no tag — immutable, cached forever.
 */
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

export async function appendMessage(
  chatId: string,
  role: "user" | "assistant",
  content: string,
): Promise<MessageRow> {
  const supabase = await createClient();
  const [insertResult] = await Promise.all([
    supabase
      .from("messages")
      .insert({ chat_id: chatId, role, content })
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

export async function appendMessageWithParts(
  chatId: string,
  role: "user" | "assistant",
  parts: import("./types").MessagePart[],
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

export async function listMemoryFiles(
  userId: string,
): Promise<MemoryFileRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memory_files")
    .select("*")
    .eq("user_id", userId)
    .order("path", { ascending: true })
    .limit(200);

  if (isMissingMemoryFilesTable(error)) return [];
  if (error) throw error;
  return data ?? [];
}

export async function listAutoloadMemoryFiles(
  userId: string,
): Promise<MemoryFileRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memory_files")
    .select("*")
    .eq("user_id", userId)
    .eq("autoload", true)
    .order("path", { ascending: true })
    .limit(100);

  if (isMissingMemoryFilesTable(error)) return [];
  if (error) throw error;
  return data ?? [];
}

export async function getMemoryFileById(
  userId: string,
  fileId: string,
): Promise<MemoryFileRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memory_files")
    .select("*")
    .eq("user_id", userId)
    .eq("id", fileId)
    .maybeSingle();

  if (isMissingMemoryFilesTable(error)) return null;
  if (error) throw error;
  return data;
}

export async function getMemoryFileByPath(
  userId: string,
  path: string,
): Promise<MemoryFileRow | null> {
  const normalizedPath = normalizeMemoryPath(path);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memory_files")
    .select("*")
    .eq("user_id", userId)
    .eq("path", normalizedPath)
    .maybeSingle();

  if (isMissingMemoryFilesTable(error)) return null;
  if (error) throw error;
  return data;
}

export async function createMemoryFile(
  userId: string,
  input: {
    path: string;
    title?: string;
    content?: string;
    autoload?: boolean;
    source?: MemoryFileSource;
  },
): Promise<MemoryFileRow> {
  const path = normalizeMemoryPath(input.path);
  const autoload = isAutoloadMemoryPath(path) ? true : (input.autoload ?? false);
  const now = new Date().toISOString();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memory_files")
    .insert({
      user_id: userId,
      path,
      title: input.title?.trim() || titleFromMemoryPath(path),
      content: input.content ?? "",
      autoload,
      source: input.source ?? "user",
      updated_at: now,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateMemoryFile(
  userId: string,
  fileId: string,
  patch: {
    path?: string;
    title?: string;
    content?: string;
    autoload?: boolean;
    source?: MemoryFileSource;
  },
): Promise<MemoryFileRow | null> {
  const existing = await getMemoryFileById(userId, fileId);
  if (!existing) return null;

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (patch.path !== undefined) {
    const normalized = normalizeMemoryPath(patch.path);
    if (
      normalized !== existing.path &&
      (isProtectedMemoryPath(existing.path) || isProtectedMemoryPath(normalized))
    ) {
      throw new Error("protected_file");
    }
    updates.path = normalized;
  }
  if (patch.title !== undefined) {
    updates.title =
      patch.title.trim() ||
      titleFromMemoryPath(String(updates.path ?? existing.path));
  }
  if (patch.content !== undefined) updates.content = patch.content;
  if (patch.autoload !== undefined) {
    updates.autoload = isAutoloadMemoryPath(existing.path)
      ? true
      : patch.autoload;
  }
  if (patch.source !== undefined) updates.source = patch.source;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memory_files")
    .update(updates)
    .eq("id", fileId)
    .eq("user_id", userId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertMemoryFile(
  userId: string,
  input: {
    path: string;
    title?: string;
    content: string;
    autoload?: boolean;
    source?: MemoryFileSource;
  },
): Promise<MemoryFileRow> {
  const path = normalizeMemoryPath(input.path);
  const existing = await getMemoryFileByPath(userId, path);
  const now = new Date().toISOString();
  const autoload = isAutoloadMemoryPath(path)
    ? true
    : (input.autoload ?? existing?.autoload ?? false);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memory_files")
    .upsert(
      {
        user_id: userId,
        path,
        title: input.title?.trim() || existing?.title || titleFromMemoryPath(path),
        content: input.content,
        autoload,
        source: input.source ?? "agent",
        updated_at: now,
      },
      { onConflict: "user_id,path" },
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function appendMemoryFile(
  userId: string,
  input: {
    path: string;
    content: string;
    autoload?: boolean;
    source?: MemoryFileSource;
  },
): Promise<MemoryFileRow> {
  const path = normalizeMemoryPath(input.path);
  const existing = await getMemoryFileByPath(userId, path);
  const content = input.content.trim();
  if (!content) throw new Error("empty_content");

  if (!existing) {
    return upsertMemoryFile(userId, {
      path,
      title: titleFromMemoryPath(path),
      content,
      autoload: input.autoload ?? false,
      source: input.source ?? "agent",
    });
  }

  const nextContent = `${existing.content.trimEnd()}\n\n${content}`.trim();
  const updated = await updateMemoryFile(userId, existing.id, {
    content: nextContent,
    autoload: input.autoload ?? existing.autoload,
    source: input.source ?? existing.source,
  });

  if (!updated) throw new Error("memory_file_not_found");
  return updated;
}

export async function moveMemoryFolder(
  userId: string,
  fromPrefix: string,
  toPrefix: string,
): Promise<MemoryFileRow[]> {
  const normalizedFrom = normalizeFolderPrefix(fromPrefix);
  const normalizedTo = normalizeFolderPrefix(toPrefix);
  const files = await listMemoryFiles(userId);
  const targets = files.filter((file) => file.path.startsWith(normalizedFrom));

  const updates = await Promise.all(
    targets.map((file) => {
      const nextPath = normalizeMemoryPath(
        `${normalizedTo}${file.path.slice(normalizedFrom.length)}`,
      );
      return updateMemoryFile(userId, file.id, { path: nextPath });
    }),
  );

  return updates.filter((row): row is MemoryFileRow => row !== null);
}

export async function deleteMemoryFile(
  userId: string,
  fileId: string,
): Promise<void> {
  const existing = await getMemoryFileById(userId, fileId);
  if (!existing) return;
  if (isProtectedMemoryPath(existing.path)) {
    throw new Error("protected_file");
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("memory_files")
    .delete()
    .eq("id", fileId)
    .eq("user_id", userId);

  if (error) throw error;
}

export const ensureStarterMemoryFiles = cache(_ensureStarterMemoryFiles);

async function _ensureStarterMemoryFiles(
  userId: string,
): Promise<MemoryFileRow[]> {
  const existing = await listMemoryFiles(userId);
  const existingPaths = new Set(existing.map((file) => file.path));

  const [profile, facts] = await Promise.all([
    getUserProfile(userId),
    listUserFacts(userId),
  ]);
  const starterFiles = buildStarterMemoryFiles(profile, facts);
  const missing = starterFiles.filter((file) => !existingPaths.has(file.path));

  if (missing.length === 0) return existing;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memory_files")
    .insert(
      missing.map((file) => ({
        user_id: userId,
        ...file,
        updated_at: new Date().toISOString(),
      })),
    )
    .select();

  if (isMissingMemoryFilesTable(error)) {
    return buildVirtualStarterMemoryFiles(userId, profile, facts);
  }
  if (error) throw error;
  return [...existing, ...(data ?? [])].sort((a, b) =>
    a.path.localeCompare(b.path),
  );
}

export function summarizeMemoryFiles(files: MemoryFileRow[]) {
  return files.map((file) => ({
    id: file.id,
    path: file.path,
    title: file.title,
    autoload: file.autoload,
    source: file.source,
    updated_at: file.updated_at,
    preview: memoryPreview(file.content),
  }));
}

export async function getStarterPrompts(
  userId: string,
): Promise<StarterPromptRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_starter_prompts")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (isMissingStarterPromptsTable(error)) return null;
  if (error) throw error;
  return normalizeStarterPromptRow(data);
}

export async function upsertStarterPrompts(
  userId: string,
  input: {
    prompts: StarterPrompt[];
    sourceProvider: ProviderId;
    sourceModel: string;
    generatedAt?: string;
  },
): Promise<StarterPromptRow> {
  if (input.prompts.length !== 6) {
    throw new Error("starter_prompts_requires_six");
  }

  const now = new Date().toISOString();
  const generatedAt = input.generatedAt ?? now;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("user_starter_prompts")
    .upsert(
      {
        user_id: userId,
        prompts: input.prompts,
        generated_at: generatedAt,
        source_provider: input.sourceProvider,
        source_model: input.sourceModel,
        updated_at: now,
      },
      { onConflict: "user_id" },
    )
    .select()
    .single();

  if (error) throw error;
  const row = normalizeStarterPromptRow(data);
  if (!row) throw new Error("starter_prompts_upsert_failed");
  return row;
}

export async function listStarterPromptRefreshCandidates(
  opts: { staleBefore: Date; limit?: number },
): Promise<StarterPromptRefreshCandidate[]> {
  const limit = Math.min(Math.max(opts.limit ?? 10, 1), 50);
  const supabase = createAdminClient();
  const { data: keyRows, error: keyError } = await supabase
    .from("user_provider_keys")
    .select("user_id, provider, updated_at")
    .order("updated_at", { ascending: false })
    .limit(500);

  if (keyError) throw keyError;
  if (!keyRows?.length) return [];

  const userIds = Array.from(new Set(keyRows.map((row) => row.user_id)));
  const [{ data: profiles, error: profileError }, promptsResult] =
    await Promise.all([
      supabase
        .from("user_profiles")
        .select("user_id, active_provider, active_model, updated_at")
        .in("user_id", userIds),
      supabase
        .from("user_starter_prompts")
        .select("user_id, generated_at")
        .in("user_id", userIds),
    ]);

  if (profileError) throw profileError;
  if (
    promptsResult.error &&
    !isMissingStarterPromptsTable(promptsResult.error)
  ) {
    throw promptsResult.error;
  }

  const keyProvidersByUser = new Map<string, Set<string>>();
  for (const row of keyRows) {
    const current = keyProvidersByUser.get(row.user_id) ?? new Set<string>();
    current.add(row.provider);
    keyProvidersByUser.set(row.user_id, current);
  }

  const generatedByUser = new Map<string, string>();
  for (const row of promptsResult.data ?? []) {
    generatedByUser.set(row.user_id, row.generated_at);
  }

  const staleBeforeMs = opts.staleBefore.getTime();
  const candidates: StarterPromptRefreshCandidate[] = [];
  for (const profile of profiles ?? []) {
    const provider = isProviderId(profile.active_provider)
      ? profile.active_provider
      : "anthropic";
    const model = isModelForProvider(provider, profile.active_model)
      ? profile.active_model
      : defaultModel(provider);
    if (!keyProvidersByUser.get(profile.user_id)?.has(provider)) continue;

    const generatedAt = generatedByUser.get(profile.user_id);
    if (generatedAt && new Date(generatedAt).getTime() >= staleBeforeMs) {
      continue;
    }

    candidates.push({ userId: profile.user_id, provider, model });
    if (candidates.length >= limit) break;
  }

  return candidates;
}

export async function getStarterPromptContext(
  userId: string,
): Promise<StarterPromptContext> {
  const supabase = createAdminClient();
  const [{ data: profile, error: profileError }, memoryResult] =
    await Promise.all([
      supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("memory_files")
        .select("*")
        .eq("user_id", userId)
        .eq("autoload", true)
        .order("path", { ascending: true })
        .limit(8),
    ]);

  if (profileError) throw profileError;
  if (memoryResult.error && !isMissingMemoryFilesTable(memoryResult.error)) {
    throw memoryResult.error;
  }

  const { data: chats, error: chatsError } = await supabase
    .from("chats")
    .select("id")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(8);

  if (chatsError) throw chatsError;
  const chatIds = (chats ?? []).map((chat) => chat.id);
  let recentMessages: string[] = [];

  if (chatIds.length > 0) {
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("content, created_at")
      .in("chat_id", chatIds)
      .eq("role", "user")
      .order("created_at", { ascending: false })
      .limit(12);

    if (messagesError) throw messagesError;
    recentMessages = (messages ?? [])
      .map((message) => String(message.content ?? "").trim())
      .filter(Boolean);
  }

  return {
    profile: profile as UserProfileRow | null,
    memoryFiles: (memoryResult.data ?? []) as MemoryFileRow[],
    recentMessages,
  };
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

export async function getVideo(
  userId: string,
  videoId: string,
): Promise<VideoRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("videos")
    .select("*")
    .eq("id", videoId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listVideos(userId: string): Promise<VideoRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("videos")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(100);

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

export async function listHooks(userId: string): Promise<HookRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hooks")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function getHook(
  userId: string,
  hookId: string,
): Promise<HookRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hooks")
    .select("*")
    .eq("id", hookId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createHook(
  userId: string,
  input: {
    text: string;
    notes?: string;
    tags?: string[];
    source?: HookSource;
    sourceChatId?: string | null;
    sourceVideoId?: string | null;
  },
): Promise<HookRow> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hooks")
    .insert({
      user_id: userId,
      text: input.text,
      notes: input.notes ?? "",
      tags: input.tags ?? [],
      source: input.source ?? "manual",
      source_chat_id: input.sourceChatId ?? null,
      source_video_id: input.sourceVideoId ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateHook(
  userId: string,
  hookId: string,
  patch: { text?: string; notes?: string; tags?: string[] },
): Promise<HookRow | null> {
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.text !== undefined) updates.text = patch.text;
  if (patch.notes !== undefined) updates.notes = patch.notes;
  if (patch.tags !== undefined) updates.tags = patch.tags;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hooks")
    .update(updates)
    .eq("id", hookId)
    .eq("user_id", userId)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteHook(
  userId: string,
  hookId: string,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("hooks")
    .delete()
    .eq("id", hookId)
    .eq("user_id", userId);
  if (error) throw error;
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

export const listProviderKeyMeta = cache(
  async (userId: string): Promise<ProviderKeyMetaRow[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("user_provider_keys")
      .select("provider, last4, updated_at")
      .eq("user_id", userId);

    if (error) throw error;
    return data ?? [];
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

export async function getDecryptedProviderKeyAdmin(
  userId: string,
  provider: ProviderId,
): Promise<string | null> {
  const supabase = createAdminClient();
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
    const fallbackProvider: ProviderId = "anthropic";
    const provider = isProviderId(profile?.active_provider)
      ? profile.active_provider
      : fallbackProvider;
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

function normalizeFolderPrefix(prefix: string): string {
  const trimmed = prefix.trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if (!trimmed || trimmed.includes("..")) throw new Error("invalid_path");
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

function isMissingTable(error: unknown, tableName: string): boolean {
  if (!error || typeof error !== "object") return false;
  const maybe = error as { code?: unknown; message?: unknown };
  return (
    maybe.code === "PGRST205" &&
    typeof maybe.message === "string" &&
    maybe.message.includes(tableName)
  );
}

function isMissingMemoryFilesTable(error: unknown): boolean {
  return isMissingTable(error, "memory_files");
}

function isMissingStarterPromptsTable(error: unknown): boolean {
  return isMissingTable(error, "user_starter_prompts");
}

function normalizeStarterPromptRow(
  row: unknown,
): StarterPromptRow | null {
  if (!row || typeof row !== "object") return null;
  const maybe = row as Omit<StarterPromptRow, "prompts"> & {
    prompts?: unknown;
  };
  if (!Array.isArray(maybe.prompts)) return null;

  return {
    ...maybe,
    prompts: maybe.prompts
      .map(normalizeStarterPrompt)
      .filter((prompt): prompt is StarterPrompt => Boolean(prompt)),
  };
}

const STARTER_PROMPT_ICONS: ReadonlySet<StarterPromptIcon> = new Set([
  "target",
  "lightbulb",
  "flame",
  "users",
  "message",
  "video",
  "sparkles",
  "zap",
]);

function normalizeStarterPrompt(prompt: unknown): StarterPrompt | null {
  if (typeof prompt === "string") {
    const text = prompt.trim();
    return text ? { text, icon: "sparkles" } : null;
  }

  if (!prompt || typeof prompt !== "object") return null;
  const maybe = prompt as { text?: unknown; icon?: unknown };
  const text = String(maybe.text ?? "").trim();
  if (!text) return null;

  const icon = STARTER_PROMPT_ICONS.has(maybe.icon as StarterPromptIcon)
    ? (maybe.icon as StarterPromptIcon)
    : "sparkles";

  return { text, icon };
}

function buildVirtualStarterMemoryFiles(
  userId: string,
  profile: UserProfileRow | null,
  facts: UserFactRow[],
): MemoryFileRow[] {
  const now = new Date().toISOString();
  return buildStarterMemoryFiles(profile, facts).map((file) => ({
    id: `virtual:${file.path}`,
    user_id: userId,
    path: file.path,
    title: file.title,
    content: file.content,
    autoload: file.autoload,
    source: file.source,
    created_at: now,
    updated_at: now,
  }));
}
