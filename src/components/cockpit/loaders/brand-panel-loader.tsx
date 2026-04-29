import { getCoreInstructions } from "@/lib/anthropic";
import { ensureStarterMemoryFiles } from "@/lib/db/queries";
import {
  SYSTEM_PROMPT_VIRTUAL_ID,
  SYSTEM_PROMPT_VIRTUAL_PATH,
} from "@/lib/memory";
import { BrandPanel } from "@/components/cockpit/brand-panel";
import type { MemoryFileRow } from "@/lib/db/types";

type Props = {
  userId: string;
};

export async function BrandPanelLoader({ userId }: Props) {
  const files = await ensureStarterMemoryFiles(userId);
  const now = new Date().toISOString();
  const systemPromptFile: MemoryFileRow = {
    id: SYSTEM_PROMPT_VIRTUAL_ID,
    user_id: userId,
    path: SYSTEM_PROMPT_VIRTUAL_PATH,
    title: "System Prompt",
    content: getCoreInstructions(),
    autoload: false,
    source: "migration",
    created_at: now,
    updated_at: now,
  };

  return <BrandPanel files={[systemPromptFile, ...files]} />;
}
