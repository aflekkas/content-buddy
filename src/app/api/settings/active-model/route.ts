import { z } from "zod";
import {
  errorResponse,
  jsonResponse,
  parseBody,
  requireAuth,
} from "@/lib/api";
import { isProviderId, PROVIDER_IDS } from "@/lib/providers";
import { getActiveModel, setActiveModel } from "@/lib/db/queries";

const PutBody = z.object({
  provider: z.enum(PROVIDER_IDS as [string, ...string[]]),
  model: z.string().min(1).max(120),
});

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  return jsonResponse(await getActiveModel(auth.user.id));
}

export async function PUT(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const parsed = await parseBody(req, PutBody);
  if (!parsed.ok) return parsed.response;
  const { provider, model } = parsed.data;
  if (!isProviderId(provider)) {
    return errorResponse("unknown_provider", 400);
  }

  try {
    const result = await setActiveModel(auth.user.id, provider, model);
    return jsonResponse(result);
  } catch {
    return errorResponse("unknown_model", 400);
  }
}
