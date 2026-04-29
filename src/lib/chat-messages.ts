import type { UIMessage } from "ai";
import type { MessageRow } from "@/lib/db/types";

export function toUIMessages(rows: MessageRow[]): UIMessage[] {
  return rows.map((row) => ({
    id: row.id,
    role: row.role,
    parts:
      row.parts && row.parts.length > 0
        ? row.parts
        : [{ type: "text", text: row.content }],
    // Preserve created_at for pagination cursor (before= query param).
    // Cast through unknown because UIMessage's metadata type is loose.
    metadata: { createdAt: row.created_at },
  })) as UIMessage[];
}
