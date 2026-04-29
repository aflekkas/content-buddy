import { z } from "zod";
import { jsonResponse, parseBody, requireAuth } from "@/lib/api";
import { upsertUserProfile } from "@/lib/db/queries";

const ASSISTANT_NAME_MAX = 60;
const ASSISTANT_PERSONA_MAX = 1000;

const PutBody = z.object({
  assistant_name: z
    .string()
    .trim()
    .max(ASSISTANT_NAME_MAX)
    .nullable()
    .optional(),
  assistant_persona: z
    .string()
    .trim()
    .max(ASSISTANT_PERSONA_MAX)
    .nullable()
    .optional(),
});

export async function PUT(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const parsed = await parseBody(req, PutBody);
  if (!parsed.ok) return parsed.response;

  const patch: { assistant_name?: string | null; assistant_persona?: string | null } = {};
  if (parsed.data.assistant_name !== undefined) {
    patch.assistant_name = parsed.data.assistant_name?.length
      ? parsed.data.assistant_name
      : null;
  }
  if (parsed.data.assistant_persona !== undefined) {
    patch.assistant_persona = parsed.data.assistant_persona?.length
      ? parsed.data.assistant_persona
      : null;
  }

  const profile = await upsertUserProfile(auth.user.id, patch);
  return jsonResponse({
    assistant_name: profile.assistant_name,
    assistant_persona: profile.assistant_persona,
  });
}
