import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import type { ProviderId } from "./providers";

export function getModel(
  provider: ProviderId,
  modelId: string,
  apiKey: string,
): LanguageModel {
  if (provider !== "openai") {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  return createOpenAI({ apiKey })(modelId);
}
