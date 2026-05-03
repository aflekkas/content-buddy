import { z } from "zod";
import { errorResponse, jsonResponse, parseBody, requireAuth } from "@/lib/api";
import { createSource, listSources } from "@/lib/db/queries";
import { probeFeed } from "@/lib/sources/rss";

const RssSource = z.object({
  kind: z.literal("rss_feed"),
  url: z.string().trim().url().max(500),
  topic_tags: z.array(z.string().trim().min(1).max(64)).max(20).optional(),
  poll_interval_hours: z.number().int().min(1).max(168).optional(),
});

const PostBody = z.union([
  RssSource,
  z.object({ sources: z.array(RssSource).min(1).max(50) }),
]);

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  return jsonResponse(await listSources(auth.user.id));
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const parsed = await parseBody(req, PostBody, {
    errorCode: "invalid_body",
    includeDetails: true,
  });
  if (!parsed.ok) return parsed.response;

  const inputs = "sources" in parsed.data ? parsed.data.sources : [parsed.data];

  const created = [];
  const failures: Array<{ url: string; reason: string }> = [];

  for (const input of inputs) {
    const probe = await probeFeed(input.url);
    if (!probe.ok) {
      failures.push({ url: input.url, reason: probe.message });
      continue;
    }
    try {
      const source = await createSource(auth.user.id, {
        kind: "rss_feed",
        handle: probe.title.slice(0, 80),
        url: input.url,
        topic_tags: input.topic_tags,
        poll_interval_hours: input.poll_interval_hours,
      });
      created.push(source);
    } catch (error) {
      failures.push({
        url: input.url,
        reason: error instanceof Error ? error.message : "create_failed",
      });
    }
  }

  if (created.length === 0) {
    return errorResponse("create_failed", 400, { failures });
  }

  return jsonResponse(
    "sources" in parsed.data ? { created, failures } : created[0],
    { status: 201 },
  );
}
