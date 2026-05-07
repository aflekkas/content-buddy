import { z } from "zod";
import type { UIMessage } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";

const CHAT_ATTACHMENTS_BUCKET = "chat-attachments";
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;
const MAX_BODY_BYTES = 250_000;
const MAX_MESSAGES = 50;
const MAX_PARTS_PER_MESSAGE = 100;
const MAX_TEXT_CHARS_PER_PART = 20_000;
const MAX_TOTAL_TEXT_CHARS = 80_000;
const ALLOWED_IMAGE_MEDIA_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

const ChatRequestSchema = z.object({
  id: z.uuid(),
  messages: z.array(z.unknown()).min(1).max(MAX_MESSAGES),
  activeDraftId: z.uuid().optional(),
});

export type ChatRequestBody = {
  id: string;
  messages: UIMessage[];
  activeDraftId?: string;
};

type FilePart = {
  type: "file";
  url: string;
  mediaType: string;
  filename?: string;
  path?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).byteLength;
}

export async function parseChatRequestBody(
  req: Request,
): Promise<
  | { ok: true; data: ChatRequestBody }
  | { ok: false; status: number; error: string; details?: unknown }
> {
  const raw = await req.text();
  if (byteLength(raw) > MAX_BODY_BYTES) {
    return { ok: false, status: 413, error: "payload_too_large" };
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, status: 400, error: "bad_json" };
  }

  const parsed = ChatRequestSchema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      error: "invalid_body",
      details: parsed.error.flatten(),
    };
  }

  let totalTextChars = 0;
  for (const message of parsed.data.messages) {
    if (!isRecord(message)) {
      return { ok: false, status: 400, error: "invalid_message" };
    }
    if (typeof message.id !== "string" || message.id.length > 128) {
      return { ok: false, status: 400, error: "invalid_message_id" };
    }
    if (
      message.role !== "system" &&
      message.role !== "user" &&
      message.role !== "assistant"
    ) {
      return { ok: false, status: 400, error: "invalid_message_role" };
    }
    if (
      !Array.isArray(message.parts) ||
      message.parts.length > MAX_PARTS_PER_MESSAGE
    ) {
      return { ok: false, status: 400, error: "invalid_message_parts" };
    }
    for (const part of message.parts) {
      if (!isRecord(part) || typeof part.type !== "string") {
        return { ok: false, status: 400, error: "invalid_message_part" };
      }
      if (part.type === "text") {
        if (typeof part.text !== "string") {
          return { ok: false, status: 400, error: "invalid_text_part" };
        }
        if (part.text.length > MAX_TEXT_CHARS_PER_PART) {
          return { ok: false, status: 413, error: "text_part_too_large" };
        }
        totalTextChars += part.text.length;
      } else if (part.type === "file") {
        if (
          typeof part.mediaType !== "string" ||
          !ALLOWED_IMAGE_MEDIA_TYPES.has(part.mediaType)
        ) {
          return { ok: false, status: 415, error: "unsupported_type" };
        }
        if (typeof part.path !== "string" || part.path.length > 300) {
          return { ok: false, status: 400, error: "invalid_attachment" };
        }
      }
    }
  }

  if (totalTextChars > MAX_TOTAL_TEXT_CHARS) {
    return { ok: false, status: 413, error: "payload_too_large" };
  }

  return { ok: true, data: parsed.data as ChatRequestBody };
}

export async function refreshUserAttachmentUrls(args: {
  messages: UIMessage[];
  userId: string;
  supabase: SupabaseClient;
}): Promise<{ ok: true; messages: UIMessage[] } | { ok: false; error: string }> {
  const messages = structuredClone(args.messages) as UIMessage[];
  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type !== "file") continue;
      const file = part as FilePart;
      if (!file.path || !file.path.startsWith(`${args.userId}/`)) {
        return { ok: false, error: "invalid_attachment" };
      }
      const { data, error } = await args.supabase.storage
        .from(CHAT_ATTACHMENTS_BUCKET)
        .createSignedUrl(file.path, SIGNED_URL_TTL_SECONDS);
      if (error || !data?.signedUrl) {
        return { ok: false, error: "attachment_sign_failed" };
      }
      file.url = data.signedUrl;
    }
  }

  return { ok: true, messages };
}
