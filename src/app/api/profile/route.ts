import { z } from "zod";
import { jsonResponse, parseBody, requireAuth } from "@/lib/api";
import { getUserProfile, upsertUserProfile } from "@/lib/db/queries";
import { POST_TYPES } from "@/lib/db/types";

const PatchBody = z.object({
  niche: z.string().trim().max(240).nullable().optional(),
  voice_notes: z.string().trim().max(1000).nullable().optional(),
  voice_samples: z.string().trim().max(20000).nullable().optional(),
  target_audience: z.string().trim().max(500).nullable().optional(),
  post_goal: z.string().trim().max(500).nullable().optional(),
  formality: z.number().int().min(1).max(5).optional(),
  elaboration: z.number().int().min(1).max(3).optional(),
  length_pref: z.number().int().min(200).max(5000).optional(),
  preferred_post_types: z.array(z.enum(POST_TYPES)).optional(),
  avoid_phrases: z.string().trim().max(1000).nullable().optional(),
  include_links: z.boolean().optional(),
});

function projectProfile(profile: {
  niche: string | null;
  voice_notes: string | null;
  voice_samples: string | null;
  target_audience?: string | null;
  post_goal?: string | null;
  formality?: number;
  elaboration?: number;
  length_pref?: number;
  preferred_post_types?: string[];
  avoid_phrases?: string | null;
  include_links?: boolean;
}) {
  return {
    niche: profile.niche ?? null,
    voice_notes: profile.voice_notes ?? null,
    voice_samples: profile.voice_samples ?? null,
    target_audience: profile.target_audience ?? null,
    post_goal: profile.post_goal ?? null,
    formality: profile.formality ?? 3,
    elaboration: profile.elaboration ?? 2,
    length_pref: profile.length_pref ?? 1500,
    preferred_post_types: profile.preferred_post_types ?? [],
    avoid_phrases: profile.avoid_phrases ?? null,
    include_links: profile.include_links ?? false,
  };
}

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const profile = await getUserProfile(auth.user.id);
  return jsonResponse(profile ? projectProfile(profile) : projectProfile({
    niche: null,
    voice_notes: null,
    voice_samples: null,
  }));
}

export async function PATCH(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const parsed = await parseBody(req, PatchBody);
  if (!parsed.ok) return parsed.response;

  const profile = await upsertUserProfile(auth.user.id, parsed.data);
  return jsonResponse(projectProfile(profile));
}
