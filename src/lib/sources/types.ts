import type { MonitoredSourceKind } from "@/lib/db/types";

export interface FetchedPost {
  externalId: string;
  url: string;
  text: string;
  postedAt: Date;
  raw: Record<string, unknown>;
}

export interface FetchCtx {
  apifyToken?: string;
}

export interface SourceFetcher {
  kind: MonitoredSourceKind;
  fetch(
    handle: string,
    since: Date | null,
    ctx: FetchCtx,
  ): Promise<FetchedPost[]>;
}
