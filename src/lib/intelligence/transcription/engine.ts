import { transcribeAudioWithDeepgram } from "@/lib/ai/deepgram";
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
  let transcription: {
    transcript: string;
    confidence?: number | null;
    language?: string;
    provider: string;
    model: string;
  };

  try {
    transcription = process.env.DEEPGRAM_API_KEY ? await transcribeAudioWithDeepgram(audio, mimeType) : await transcribeAudioWithGemini(audio, mimeType);
  } catch (error) {
    if (!process.env.DEEPGRAM_API_KEY) {
      throw error;
    }
    transcription = await transcribeAudioWithGemini(audio, mimeType);
  }

  return {
    rawText: transcription.transcript,
    cleanedText: cleanTranscriptText(transcription.transcript),
    language: transcription.language,
    provider: transcription.provider,
    model: transcription.model,
    segments: [],
    confidence: transcription.confidence ?? null
  };
}
