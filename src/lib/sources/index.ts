import type { MonitoredSourceKind } from "@/lib/db/types";
import type { SourceFetcher } from "./types";
import { rssFeedFetcher } from "./rss";

export const FETCHERS: Partial<Record<MonitoredSourceKind, SourceFetcher>> = {
  rss_feed: rssFeedFetcher,
};
