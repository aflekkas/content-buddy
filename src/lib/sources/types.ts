export interface FetchedPost {
  externalId: string;
  url: string;
  text: string;
  postedAt: Date;
  raw: Record<string, unknown>;
}

export interface FetchCtx {
  apifyToken: string;
}

export interface SourceFetcher {
  kind: "x_self" | "x_account";
  fetch(
    handle: string,
    since: Date | null,
    ctx: FetchCtx,
  ): Promise<FetchedPost[]>;
}
