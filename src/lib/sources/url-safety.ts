import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_REDIRECTS = 5;

function ipv4ToNumber(ip: string) {
  return ip
    .split(".")
    .map((part) => Number(part))
    .reduce((acc, part) => (acc << 8) + part, 0) >>> 0;
}

function isIpv4InCidr(ip: string, base: string, bits: number) {
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipv4ToNumber(ip) & mask) === (ipv4ToNumber(base) & mask);
}

export function isBlockedIpAddress(ip: string): boolean {
  if (isIP(ip) === 4) {
    return [
      ["0.0.0.0", 8],
      ["10.0.0.0", 8],
      ["100.64.0.0", 10],
      ["127.0.0.0", 8],
      ["169.254.0.0", 16],
      ["172.16.0.0", 12],
      ["192.0.0.0", 24],
      ["192.0.2.0", 24],
      ["192.168.0.0", 16],
      ["198.18.0.0", 15],
      ["198.51.100.0", 24],
      ["203.0.113.0", 24],
      ["224.0.0.0", 4],
      ["240.0.0.0", 4],
    ].some(([base, bits]) => isIpv4InCidr(ip, base as string, bits as number));
  }

  if (isIP(ip) === 6) {
    const normalized = ip.toLowerCase();
    return (
      normalized === "::" ||
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe8") ||
      normalized.startsWith("fe9") ||
      normalized.startsWith("fea") ||
      normalized.startsWith("feb") ||
      normalized.startsWith("ff")
    );
  }

  return true;
}

export function parseSafeFeedUrl(raw: string): URL {
  const url = new URL(raw);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("unsupported_feed_protocol");
  }
  if (!url.hostname) throw new Error("invalid_feed_host");
  return url;
}

export async function assertPublicHttpUrl(raw: string): Promise<URL> {
  const url = parseSafeFeedUrl(raw);
  const addresses = await lookup(url.hostname, { all: true, verbatim: false });
  if (addresses.length === 0) throw new Error("feed_host_not_found");
  if (addresses.some((address) => isBlockedIpAddress(address.address))) {
    throw new Error("blocked_feed_host");
  }
  return url;
}

export async function safeFetch(
  rawUrl: string,
  init: RequestInit,
  redirectCount = 0,
): Promise<Response> {
  const url = await assertPublicHttpUrl(rawUrl);
  const res = await fetch(url, { ...init, redirect: "manual" });

  if (res.status >= 300 && res.status < 400) {
    if (redirectCount >= MAX_REDIRECTS) throw new Error("too_many_redirects");
    const location = res.headers.get("location");
    if (!location) throw new Error("redirect_without_location");
    const next = new URL(location, url);
    return safeFetch(next.toString(), init, redirectCount + 1);
  }

  if (res.url) {
    await assertPublicHttpUrl(res.url);
  }

  return res;
}
