import { env } from "@/lib/env";

const DEEPGRAM_MODEL = process.env.DEEPGRAM_MODEL ?? "nova-2";

type DeepgramAlternative = {
  transcript?: string;
  confidence?: number;
};

type DeepgramResponse = {
  metadata?: {
    model_info?: Record<string, { name?: string }>;
  };
  results?: {
    channels?: Array<{
      alternatives?: DeepgramAlternative[];
      detected_language?: string;
    }>;
  };
};

export async function transcribeAudioWithDeepgram(audio: ArrayBuffer, mimeType: string) {
  const url = new URL("https://api.deepgram.com/v1/listen");
  url.searchParams.set("model", DEEPGRAM_MODEL);
  url.searchParams.set("smart_format", "true");
  url.searchParams.set("detect_language", "true");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Token ${env.deepgramApiKey()}`,
      "Content-Type": mimeType
    },
    body: Buffer.from(audio)
  });

  if (!response.ok) {
    throw new Error(`Deepgram request failed: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as DeepgramResponse;
  const channel = data.results?.channels?.[0];
  const alternative = channel?.alternatives?.[0];
  const transcript = alternative?.transcript?.trim();

  if (!transcript) {
    throw new Error("Deepgram response did not include transcript.");
  }

  return {
    transcript,
    confidence: alternative?.confidence ?? null,
    language: channel?.detected_language,
    provider: "deepgram",
    model: data.metadata?.model_info ? Object.values(data.metadata.model_info)[0]?.name ?? DEEPGRAM_MODEL : DEEPGRAM_MODEL
  };
}
