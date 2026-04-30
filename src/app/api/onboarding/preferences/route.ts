import { z } from "zod";
import {
  errorResponse,
  jsonResponse,
  parseBody,
  requireAuth,
  requireProviderKey,
} from "@/lib/api";
import {
  getActiveModel,
  upsertMemoryFile,
  upsertUserProfile,
} from "@/lib/db/queries";
import { NICHE_IDS, ONBOARDING_PLATFORM_IDS } from "@/lib/niches";
import { normalizeMemoryPath } from "@/lib/memory";

export const maxDuration = 15;

const ProfilePatchSchema = z
  .object({
    platforms: z
      .array(z.enum(ONBOARDING_PLATFORM_IDS as [string, ...string[]]))
      .min(1)
      .optional(),
    niche_primary: z
      .enum(NICHE_IDS as [string, ...string[]])
      .nullable()
      .optional(),
    niche_secondary: z
      .array(z.enum(NICHE_IDS as [string, ...string[]]))
      .max(3)
      .optional(),
    channel_pitch: z.string().min(3).max(500).optional(),
    audience_stage: z
      .enum(["starting", "growing", "established", "large"])
      .nullable()
      .optional(),
    primary_goal: z
      .enum(["grow", "monetize", "brand", "traffic", "experiment"])
      .nullable()
      .optional(),
  })
  .strict();

const MemoryPatchSchema = z.object({
  path: z.string().min(1).max(180),
  title: z.string().min(1).max(120).optional(),
  content: z.string().min(1).max(20000),
  autoload: z.boolean().optional(),
});

const PayloadSchema = z
  .object({
    profile: ProfilePatchSchema.optional(),
    memory: MemoryPatchSchema.optional(),
  })
  .refine((v) => v.profile || v.memory, {
    message: "profile or memory required",
  });

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { provider } = await getActiveModel(auth.user.id);
  const key = await requireProviderKey(auth.user.id, provider);
  if (!key.ok) return key.response;

  const parsed = await parseBody(req, PayloadSchema, {
    errorCode: "invalid_payload",
    includeDetails: true,
  });
  if (!parsed.ok) return parsed.response;

  const { profile, memory } = parsed.data;

  if (profile) {
    const trimmed: Record<string, unknown> = { ...profile };
    if (typeof profile.channel_pitch === "string") {
      trimmed.channel_pitch = profile.channel_pitch.trim();
    }
    await upsertUserProfile(auth.user.id, trimmed);
  }

  if (memory) {
    let path: string;
    try {
      path = normalizeMemoryPath(memory.path);
    } catch {
      return errorResponse("invalid_path", 400);
    }
    await upsertMemoryFile(auth.user.id, {
      path,
      title: memory.title,
      content: memory.content,
      autoload: memory.autoload ?? true,
      source: "agent",
    });
  }

  return jsonResponse({ ok: true });
}
