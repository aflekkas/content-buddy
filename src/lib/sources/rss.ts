import { parseFeed } from "feedsmith";
import type { FetchedPost, SourceFetcher } from "./types";
import { safeFetch } from "./url-safety";

const FETCH_TIMEOUT_MS = 20_000;
const MAX_ITEMS = 50;
const MAX_TEXT_CHARS = 8_000;

type AnyItem = Record<string, unknown>;

function asString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "value" in value) {
    const inner = (value as { value?: unknown }).value;
    if (typeof inner === "string") return inner;
  }
  return undefined;
}

function pickAtomLink(links: unknown): string | undefined {
  if (!Array.isArray(links)) return undefined;
  const alt = links.find(
    (link) =>
      link && typeof link === "object" && (link as AnyItem).rel === "alternate",
  ) ?? links[0];
  if (alt && typeof alt === "object") {
    const href = (alt as AnyItem).href;
    if (typeof href === "string") return href;
  }
  return undefined;
}

function normaliseItem(
  raw: AnyItem,
  format: string,
  feedLink: string,
): FetchedPost | null {
  const title = asString(raw.title);
  const description = asString(raw.description) ?? asString(raw.summary);
  const contentText =
    asString(raw.content) ??
    (raw.content && typeof raw.content === "object"
      ? asString((raw.content as AnyItem).value)
      : undefined);

  const linkFromRss =
    typeof raw.link === "string" ? raw.link : pickAtomLink(raw.links);
  const url = linkFromRss ?? feedLink;
  if (!url) return null;

  const guidValue =
    typeof raw.guid === "string"
      ? raw.guid
      : raw.guid && typeof raw.guid === "object"
        ? asString((raw.guid as AnyItem).value)
        : undefined;
  const externalId =
    guidValue ?? (typeof raw.id === "string" ? raw.id : url);

  const dateRaw =
    raw.pubDate ?? raw.published ?? raw.updated ?? raw.date_published;
  const postedAt =
    dateRaw instanceof Date
      ? dateRaw
      : typeof dateRaw === "string"
        ? new Date(dateRaw)
        : new Date();

  const body = [title, description, contentText]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join("\n\n")
    .slice(0, MAX_TEXT_CHARS);

  if (!body) return null;

  return {
    externalId,
    url,
    text: body,
    postedAt,
    raw: { format, ...raw },
  };
}

async function fetchFeed(url: string): Promise<string> {
  const res = await safeFetch(url, {
    headers: {
      "user-agent": "LinkedInStudio/1.0 (+https://github.com/aflekkas/linkedin-studio)",
      accept:
        "application/rss+xml, application/atom+xml, application/xml, application/json, text/xml;q=0.9, */*;q=0.5",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`feed fetch ${res.status} ${res.statusText}`);
  }
  return await res.text();
}

export async function probeFeed(
  url: string,
): Promise<{ ok: true; title: string } | { ok: false; message: string }> {
  try {
    const body = await fetchFeed(url);
    const parsed = parseFeed(body);
    const feed = parsed.feed as Record<string, unknown>;
    const title = asString(feed.title) ?? new URL(url).hostname;
    return { ok: true, title };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "could not parse feed",
    };
  }
}

export const rssFeedFetcher: SourceFetcher = {
  kind: "rss_feed",
  async fetch(target, since) {
    const body = await fetchFeed(target);
    const parsed = parseFeed(body);
    const feed = parsed.feed as Record<string, unknown>;
    const feedLink =
      typeof feed.link === "string"
        ? feed.link
        : pickAtomLink(feed.links) ?? target;

    const itemsRaw = (feed.items ?? feed.entries ?? []) as unknown;
    if (!Array.isArray(itemsRaw)) return [];

    const cutoff = since ? since.getTime() : 0;
    const out: FetchedPost[] = [];

    for (const raw of itemsRaw.slice(0, MAX_ITEMS) as AnyItem[]) {
      const post = normaliseItem(raw, parsed.format, feedLink);
      if (!post) continue;
      if (cutoff && post.postedAt.getTime() <= cutoff) continue;
      out.push(post);
    }

    return out;
  },
};
