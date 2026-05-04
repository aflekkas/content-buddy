import { z } from "zod";
import { POST_TYPES } from "@/lib/db/types";
import { PROVIDER_IDS } from "@/lib/providers";

// AI-callable subset of user_profiles fields. When adding a new PATCH field,
// decide consciously: should the chat AI be able to set it (extend this schema)
// or is it model-picker / infra only (extend ProfilePatchBody only)?
export const ProfileSettingsBody = z.object({
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

export const ProfilePatchBody = ProfileSettingsBody.extend({
  active_provider_id: z.enum(PROVIDER_IDS as [string, ...string[]]).optional(),
  active_model_id: z.string().min(1).max(64).optional(),
});

export const SETTINGS_FIELDS = [
  "niche",
  "voice_notes",
  "voice_samples",
  "target_audience",
  "post_goal",
  "formality",
  "elaboration",
  "length_pref",
  "preferred_post_types",
  "avoid_phrases",
  "include_links",
] as const;

export type ProfileSettingsInput = z.infer<typeof ProfileSettingsBody>;
export type ProfilePatchInput = z.infer<typeof ProfilePatchBody>;
