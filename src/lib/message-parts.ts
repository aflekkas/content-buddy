import type { UIMessage } from "ai";
import type { MessagePart } from "@/lib/db/types";

export function filterPersistableParts(
  parts: UIMessage["parts"],
): MessagePart[] {
  const out: MessagePart[] = [];
  for (const p of parts) {
    if (p.type === "text" || p.type === "reasoning") {
      out.push({ type: p.type, text: p.text } as MessagePart);
    } else if (p.type === "file") {
      const f = p as { url: string; mediaType: string; filename?: string };
      out.push({
        type: "file",
        url: f.url,
        mediaType: f.mediaType,
        filename: f.filename,
      });
    } else if (p.type.startsWith("tool-")) {
      const t = p as Record<string, unknown>;
      out.push({
        type: p.type as `tool-${string}`,
        toolCallId: t.toolCallId as string | undefined,
        state: t.state as string | undefined,
        input: t.input,
        output: t.output,
        errorText: t.errorText as string | undefined,
      });
    }
  }
  return out;
}

export function extractText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("")
    .trim();
}
