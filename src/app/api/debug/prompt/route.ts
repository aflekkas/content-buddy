import { jsonResponse, requireAuth } from "@/lib/api";
import { getUserProfile, listMemories } from "@/lib/db/queries";
import {
  buildCreatorProfileBlock,
  buildMemoryBlock,
  getCoreInstructions,
} from "@/lib/system-prompt";
import {
  BEST_PRACTICES,
  POST_TYPE_FRAMEWORK,
  audienceBlock,
  styleBlock,
} from "@/lib/synthesis";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const [profile, memories] = await Promise.all([
    getUserProfile(auth.user.id),
    listMemories(auth.user.id),
  ]);

  const creatorBlock = profile
    ? buildCreatorProfileBlock({
        niche: profile.niche,
        voice_notes: profile.voice_notes,
      })
    : "";
  const memoryBlock = buildMemoryBlock(memories);
  const styleText = styleBlock(profile);
  const audienceText = audienceBlock(profile);

  const chatPrompt = [
    "## Chat system prompt (every turn)",
    "",
    "### CORE_INSTRUCTIONS",
    getCoreInstructions(),
    memoryBlock ? `\n### <memory>\n${memoryBlock}` : "\n### <memory>\n(empty — no memories yet)",
    creatorBlock ? `\n### <creator_profile>\n${creatorBlock}` : "\n### <creator_profile>\n(empty — set niche / voice_notes via Memory rail)",
    `\n### <style_preferences>\n${styleText}`,
    `\n### <audience_context>\n${audienceText}`,
  ].join("\n");

  const synthesisPrompt = [
    "## Synthesis prompt (used by /api/scan and synthesize_from_news)",
    "",
    "### <role>",
    "You are a LinkedIn ghostwriter for one operator. Convert the source signals into ONE publish-ready LinkedIn post in the operator's voice. The bar is parity with a top human ghostwriter — generic LinkedIn-AI slop is failure.",
    "",
    "### <best_practices>",
    BEST_PRACTICES,
    "",
    "### <post_type_framework>",
    POST_TYPE_FRAMEWORK,
    "",
    "### <facts type=\"ground_truth\">",
    "(filled at call time with the picked signal sources — text, url, posted_at)",
    "",
    "### <creator_profile type=\"ground_truth\">",
    creatorBlock || "(empty — set niche / voice_notes via Memory rail)",
    "",
    "### <style_preferences type=\"soft_hints\">",
    styleText,
    "",
    "### <audience_context type=\"soft_hints\">",
    audienceText,
    "",
    "### <output_contract>",
    'Return ONLY a JSON object: { "post_type": one of the canonical types, "body": LinkedIn post body }. No markdown fences, no preamble.',
  ].join("\n");

  return jsonResponse({
    chat_prompt: chatPrompt,
    synthesis_prompt: synthesisPrompt,
  });
}
