import { jsonResponse, requireAuth } from "@/lib/api";
import { getUserProfile, listMemories } from "@/lib/db/queries";
import {
  buildCreatorProfileBlock,
  buildMemoryBlock,
  getCoreInstructions,
} from "@/lib/system-prompt";
import {
  BEST_PRACTICES,
  EXEMPLARS,
  FORMALITY_EXEMPLARS,
  FORMALITY_VOICE_BLOCKS,
  HOUSE_VOICE,
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

  const tier = profile?.formality ?? 3;
  const isCustomTier = tier !== 3 && tier >= 1 && tier <= 5;
  const tierKey = (isCustomTier ? tier : 3) as 1 | 2 | 3 | 4 | 5;
  const formalityVoiceText = isCustomTier
    ? `<formality_voice tier="${tier}">\n${FORMALITY_VOICE_BLOCKS[tierKey]}\n</formality_voice>`
    : null;
  const tierExemplarText = isCustomTier
    ? `<tier_exemplar tier="${tier}" creator="${FORMALITY_EXEMPLARS[tierKey].creator}">\n${FORMALITY_EXEMPLARS[tierKey].body}\n</tier_exemplar>`
    : null;

  const chatPrompt = [
    "## Chat system prompt (every turn)",
    "",
    "### CORE_INSTRUCTIONS",
    getCoreInstructions(),
    "\n### <best_practices>",
    BEST_PRACTICES,
    "\n### <house_voice>",
    HOUSE_VOICE,
    "\n### <exemplars>",
    EXEMPLARS,
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
    isCustomTier ? "### <formality_voice> (replaces <house_voice> at this tier)" : "### <house_voice>",
    isCustomTier ? formalityVoiceText! : HOUSE_VOICE,
    isCustomTier ? "" : "",
    ...(isCustomTier ? ["### <tier_exemplar>", tierExemplarText!, ""] : []),
    "### <exemplars>",
    EXEMPLARS,
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
    "Return the post body as plain text, then on a new line append <post_type>...</post_type>. No JSON, no markdown fences, no preamble.",
  ].join("\n");

  return jsonResponse({
    chat_prompt: chatPrompt,
    synthesis_prompt: synthesisPrompt,
  });
}
