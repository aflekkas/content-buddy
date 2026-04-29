import { jsonResponse, requireCronSecret } from "@/lib/api";
import {
  getDecryptedProviderKeyAdmin,
  getStarterPromptContext,
  listStarterPromptRefreshCandidates,
  upsertStarterPrompts,
} from "@/lib/db/queries";
import { generateStarterPrompts } from "@/lib/starter-prompts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const REFRESH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_BATCH_SIZE = 8;

export async function GET(req: Request) {
  const denied = requireCronSecret(req);
  if (denied) return denied;

  const staleBefore = new Date(Date.now() - REFRESH_INTERVAL_MS);
  const batchSize = readBatchSize(req);
  const candidates = await listStarterPromptRefreshCandidates({
    staleBefore,
    limit: batchSize,
  });

  const summary = {
    attempted: candidates.length,
    generated: 0,
    skipped: 0,
    failed: 0,
  };

  for (const candidate of candidates) {
    try {
      const apiKey = await getDecryptedProviderKeyAdmin(
        candidate.userId,
        candidate.provider,
      );
      if (!apiKey) {
        summary.skipped += 1;
        continue;
      }

      const context = await getStarterPromptContext(candidate.userId);
      const prompts = await generateStarterPrompts({
        provider: candidate.provider,
        model: candidate.model,
        apiKey,
        context,
      });

      await upsertStarterPrompts(candidate.userId, {
        prompts,
        sourceProvider: candidate.provider,
        sourceModel: candidate.model,
      });
      summary.generated += 1;
    } catch (error) {
      console.error("[starter-prompts] refresh failed", {
        userId: candidate.userId,
        provider: candidate.provider,
        error,
      });
      summary.failed += 1;
    }
  }

  return jsonResponse({
    ...summary,
    staleBefore: staleBefore.toISOString(),
  });
}

function readBatchSize(req: Request): number {
  const url = new URL(req.url);
  const raw = Number(url.searchParams.get("limit") ?? DEFAULT_BATCH_SIZE);
  if (!Number.isFinite(raw)) return DEFAULT_BATCH_SIZE;
  return Math.min(Math.max(Math.floor(raw), 1), 25);
}
