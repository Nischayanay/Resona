import { transcribeAudioWithGemini } from "@/lib/ai/gemini";

export type StructuredTranscript = {
  rawText: string;
  cleanedText: string;
  language?: string;
  provider: string;
  model: string;
  segments: unknown[];
  confidence: number | null;
};

export function cleanTranscriptText(rawText: string) {
  return rawText.trim().replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ");
}

export async function transcribeConversationAudio(audio: ArrayBuffer, mimeType: string): Promise<StructuredTranscript> {
  const transcription = await transcribeAudioWithGemini(audio, mimeType);
  return {
    rawText: transcription.transcript,
    cleanedText: cleanTranscriptText(transcription.transcript),
    language: transcription.language,
    provider: transcription.provider,
    model: transcription.model,
    segments: [],
    confidence: null
  };
}
