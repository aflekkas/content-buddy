import { describe, expect, it } from "vitest";
import { isBlockedIpAddress, parseSafeFeedUrl } from "./url-safety";

describe("feed URL safety", () => {
  it("blocks private and local IP ranges", () => {
    expect(isBlockedIpAddress("127.0.0.1")).toBe(true);
    expect(isBlockedIpAddress("10.0.0.5")).toBe(true);
    expect(isBlockedIpAddress("172.16.1.1")).toBe(true);
    expect(isBlockedIpAddress("192.168.1.10")).toBe(true);
    expect(isBlockedIpAddress("169.254.169.254")).toBe(true);
    expect(isBlockedIpAddress("::1")).toBe(true);
    expect(isBlockedIpAddress("fc00::1")).toBe(true);
  });

  it("allows public IP ranges", () => {
    expect(isBlockedIpAddress("8.8.8.8")).toBe(false);
    expect(isBlockedIpAddress("2606:4700:4700::1111")).toBe(false);
  });

  it("only accepts http and https URLs", () => {
    expect(parseSafeFeedUrl("https://example.com/rss.xml").hostname).toBe(
      "example.com",
    );
    expect(() => parseSafeFeedUrl("file:///etc/passwd")).toThrow(
      "unsupported_feed_protocol",
    );
  });
});
