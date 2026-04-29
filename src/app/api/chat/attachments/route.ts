import { randomUUID } from "node:crypto";
import { errorResponse, jsonResponse, requireAuth } from "@/lib/api";

const BUCKET = "chat-attachments";
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return errorResponse("missing_file", 400);
  }

  if (!ALLOWED.has(file.type)) {
    return errorResponse("unsupported_type", 415, { mediaType: file.type });
  }
  if (file.size > MAX_BYTES) {
    return errorResponse("file_too_large", 413, { maxBytes: MAX_BYTES });
  }

  const ext = file.type.split("/")[1] ?? "bin";
  const path = `${auth.user.id}/${randomUUID()}.${ext}`;

  const { error: uploadError } = await auth.supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
  if (uploadError) {
    console.error("[attachments] upload failed", uploadError);
    return errorResponse("upload_failed", 500);
  }

  const { data: signed, error: signError } = await auth.supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (signError || !signed?.signedUrl) {
    return errorResponse("sign_failed", 500);
  }

  return jsonResponse({
    url: signed.signedUrl,
    path,
    mediaType: file.type,
    filename: file.name,
    size: file.size,
  });
}
