import { extractConversationWithGemini } from "@/lib/ai/gemini";
import type { ConversationExtraction } from "@/lib/ai/extraction-schema";

export type UnderstandingResult = {
  extraction: ConversationExtraction;
  raw: string;
  provider: string;
  model: string;
  promptVersion: string;
};

export async function understandConversation(transcript: string): Promise<UnderstandingResult> {
  return extractConversationWithGemini(transcript);
}
