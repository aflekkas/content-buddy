import type { UIMessage } from "ai";
import type { MessageRow } from "@/lib/db/types";

export function toUIMessages(rows: MessageRow[]): UIMessage[] {
  return rows.map((row) => ({
    id: row.id,
    role: row.role,
    parts: [{ type: "text", text: row.content }],
  })) as UIMessage[];
}
