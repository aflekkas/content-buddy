import type { SourceFetcher } from "./types";
import { apifyXAccountFetcher, apifyXSelfFetcher } from "./apify-x";

export const FETCHERS: Record<"x_self" | "x_account", SourceFetcher> = {
  x_self: apifyXSelfFetcher,
  x_account: apifyXAccountFetcher,
};
