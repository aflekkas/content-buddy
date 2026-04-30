import type { FetchedPost, FetchCtx, SourceFetcher } from "./types";

type ApifyTweet = Record<string, unknown>;

const DEFAULT_ACTOR = "apidojo/tweet-scraper";

function getActorPath() {
  return encodeURIComponent(process.env.APIFY_X_ACTOR ?? DEFAULT_ACTOR);
}

function readString(row: ApifyTweet, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return null;
}

function mapTweet(row: ApifyTweet): FetchedPost | null {
  const externalId = readString(row, ["id", "tweetId", "conversationId"]);
  const url = readString(row, ["url", "twitterUrl", "tweetUrl"]);
  const text = readString(row, ["text", "fullText", "content"]);
  const createdAt = readString(row, ["createdAt", "created_at", "timestamp"]);

  if (!externalId || !url || !text || !createdAt) return null;

  const postedAt = new Date(createdAt);
  if (Number.isNaN(postedAt.getTime())) return null;

  return {
    externalId,
    url,
    text,
    postedAt,
    raw: row,
  };
}

async function fetchViaApify(
  handle: string,
  since: Date | null,
  ctx: FetchCtx,
): Promise<FetchedPost[]> {
  const url = `https://api.apify.com/v2/acts/${getActorPath()}/run-sync-get-dataset-items?token=${encodeURIComponent(ctx.apifyToken)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      twitterHandles: [handle],
      maxItems: 50,
      onlyPostsNewerThan: since ? since.toISOString() : null,
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Apify X fetch failed (${res.status}): ${text.slice(0, 200)}`,
    );
  }

  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) return [];

  return data
    .map((row) =>
      row && typeof row === "object" ? mapTweet(row as ApifyTweet) : null,
    )
    .filter((post): post is FetchedPost => Boolean(post));
}

export const apifyXSelfFetcher: SourceFetcher = {
  kind: "x_self",
  fetch: fetchViaApify,
};

export const apifyXAccountFetcher: SourceFetcher = {
  kind: "x_account",
  fetch: fetchViaApify,
};
