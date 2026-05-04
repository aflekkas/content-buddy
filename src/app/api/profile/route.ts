import { errorResponse, jsonResponse, parseBody, requireAuth } from "@/lib/api";
import { getUserProfile, upsertUserProfile } from "@/lib/db/queries";
import {
  defaultModel,
  isModelForProvider,
  isProviderId,
} from "@/lib/providers";
import { ProfilePatchBody } from "@/lib/settings-schema";

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
  active_provider_id?: string;
  active_model_id?: string;
}) {
  const provider =
    profile.active_provider_id && isProviderId(profile.active_provider_id)
      ? profile.active_provider_id
      : "openai";
  const model =
    profile.active_model_id &&
    isModelForProvider(provider, profile.active_model_id)
      ? profile.active_model_id
      : defaultModel(provider);
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
    active_provider_id: provider,
    active_model_id: model,
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

  const parsed = await parseBody(req, ProfilePatchBody);
  if (!parsed.ok) return parsed.response;

  const patch = parsed.data;
  if (patch.active_provider_id || patch.active_model_id) {
    const existing = await getUserProfile(auth.user.id);
    const provider =
      patch.active_provider_id ??
      (existing && isProviderId(existing.active_provider_id)
        ? existing.active_provider_id
        : "openai");
    if (!isProviderId(provider)) {
      return errorResponse("invalid_provider", 400, { provider });
    }
    const model =
      patch.active_model_id ??
      (existing && isModelForProvider(provider, existing.active_model_id)
        ? existing.active_model_id
        : defaultModel(provider));
    if (!isModelForProvider(provider, model)) {
      return errorResponse("invalid_model_for_provider", 400, {
        provider,
        model,
      });
    }
    patch.active_provider_id = provider;
    patch.active_model_id = model;
  }

  const profile = await upsertUserProfile(auth.user.id, patch);
  return jsonResponse(projectProfile(profile));
}
