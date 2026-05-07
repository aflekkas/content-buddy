import { describe, expect, it } from "vitest";
import { parseChatRequestBody } from "./chat-request";

const CHAT_ID = "11111111-1111-4111-8111-111111111111";

function request(body: unknown) {
  return new Request("https://example.test/api/chat", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("chat request validation", () => {
  it("accepts a bounded text-only chat request", async () => {
    const parsed = await parseChatRequestBody(
      request({
        id: CHAT_ID,
        messages: [
          {
            id: "m1",
            role: "user",
            parts: [{ type: "text", text: "hello" }],
          },
        ],
      }),
    );

    expect(parsed.ok).toBe(true);
  });

  it("rejects oversized text parts", async () => {
    const parsed = await parseChatRequestBody(
      request({
        id: CHAT_ID,
        messages: [
          {
            id: "m1",
            role: "user",
            parts: [{ type: "text", text: "x".repeat(20_001) }],
          },
        ],
      }),
    );

    expect(parsed).toMatchObject({
      ok: false,
      status: 413,
      error: "text_part_too_large",
    });
  });

  it("requires file parts to carry an attachment path", async () => {
    const parsed = await parseChatRequestBody(
      request({
        id: CHAT_ID,
        messages: [
          {
            id: "m1",
            role: "user",
            parts: [
              {
                type: "file",
                url: "https://example.test/image.png",
                mediaType: "image/png",
              },
            ],
          },
        ],
      }),
    );

    expect(parsed).toMatchObject({
      ok: false,
      status: 400,
      error: "invalid_attachment",
    });
  });
});
