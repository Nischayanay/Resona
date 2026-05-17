import { env } from "@/lib/env";
import { buildExtractionPrompt, buildRepairPrompt, EXTRACTION_PROMPT_VERSION } from "@/lib/ai/prompts";
import { conversationExtractionSchema, type ConversationExtraction } from "@/lib/ai/extraction-schema";

const GEMINI_TEXT_MODEL = process.env.GOOGLE_AI_MODEL ?? "gemini-2.5-flash-lite";

type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } };

async function callGemini(parts: GeminiPart[]) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent?key=${env.googleAiApiKey()}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0.1,
        response_mime_type: "application/json"
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini request failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("");
  if (!text) {
    throw new Error("Gemini response did not include text.");
  }
  return text;
}

export function parseGeminiJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    if (start === -1) {
      throw new Error("AI output was not JSON.");
    }

    let depth = 0;
    let inString = false;
    let isEscaped = false;
    for (let index = start; index < text.length; index += 1) {
      const char = text[index];
      if (isEscaped) {
        isEscaped = false;
        continue;
      }
      if (char === "\\") {
        isEscaped = true;
        continue;
      }
      if (char === "\"") {
        inString = !inString;
        continue;
      }
      if (inString) {
        continue;
      }
      if (char === "{") {
        depth += 1;
      }
      if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          return JSON.parse(text.slice(start, index + 1));
        }
      }
    }

    throw new Error("AI output was not complete JSON.");
  }
}

export async function transcribeAudioWithGemini(audio: ArrayBuffer, mimeType: string) {
  const data = Buffer.from(audio).toString("base64");
  const text = await callGemini([
    {
      text: "Transcribe this audio as accurately as possible. Return JSON only in this shape: {\"transcript\":\"...\",\"language\":\"optional BCP-47 code\"}"
    },
    {
      inline_data: {
        mime_type: mimeType,
        data
      }
    }
  ]);
  const parsed = parseGeminiJson(text) as { transcript?: string; language?: string };
  if (!parsed.transcript) {
    throw new Error("Transcription response did not include transcript.");
  }
  return {
    transcript: parsed.transcript,
    language: parsed.language,
    provider: "google",
    model: GEMINI_TEXT_MODEL
  };
}

export async function extractConversationWithGemini(transcript: string) {
  const prompt = buildExtractionPrompt(transcript, new Date().toISOString());
  const raw = await callGemini([{ text: prompt }]);
  const parsed = parseGeminiJson(raw);
  const validated = conversationExtractionSchema.safeParse(parsed);

  if (validated.success) {
    return {
      raw,
      extraction: validated.data,
      model: GEMINI_TEXT_MODEL,
      provider: "google",
      promptVersion: EXTRACTION_PROMPT_VERSION
    };
  }

  const repairedRaw = await callGemini([{ text: buildRepairPrompt(raw, validated.error.message) }]);
  const repaired = conversationExtractionSchema.parse(parseGeminiJson(repairedRaw));
  return {
    raw: repairedRaw,
    extraction: repaired,
    model: GEMINI_TEXT_MODEL,
    provider: "google",
    promptVersion: EXTRACTION_PROMPT_VERSION
  };
}

export function validateExtraction(input: unknown): ConversationExtraction {
  return conversationExtractionSchema.parse(input);
}
