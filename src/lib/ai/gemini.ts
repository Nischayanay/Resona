import { env } from "@/lib/env";
import { buildExtractionPrompt, buildRepairPrompt, EXTRACTION_PROMPT_VERSION } from "@/lib/ai/prompts";
import { conversationExtractionSchema, type ConversationExtraction } from "@/lib/ai/extraction-schema";

const DEFAULT_GEMINI_TEXT_MODEL = "gemini-3.5-flash-lite";
const GEMINI_TEXT_MODEL = process.env.GOOGLE_AI_MODEL ?? DEFAULT_GEMINI_TEXT_MODEL;

type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } };

async function callGemini(parts: GeminiPart[]) {
  const models = GEMINI_TEXT_MODEL === DEFAULT_GEMINI_TEXT_MODEL
    ? [DEFAULT_GEMINI_TEXT_MODEL]
    : [GEMINI_TEXT_MODEL, DEFAULT_GEMINI_TEXT_MODEL];

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.googleAiApiKey()}`;
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

    if (response.ok) {
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("");
      if (!text) {
        throw new Error("Gemini response did not include text.");
      }
      return { text, model };
    }

    const error = await response.text();
    if (response.status !== 404 || model === DEFAULT_GEMINI_TEXT_MODEL) {
      throw new Error(`Gemini request failed: ${response.status} ${error}`);
    }
  }

  throw new Error("Gemini request failed: no available model.");
}

export async function answerWithGemini(prompt: string) {
  return (await callGemini([{ text: prompt }])).text;
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
  const result = await callGemini([
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
  const parsed = parseGeminiJson(result.text) as { transcript?: string; language?: string };
  if (!parsed.transcript) {
    throw new Error("Transcription response did not include transcript.");
  }
  return {
    transcript: parsed.transcript,
    language: parsed.language,
    provider: "google",
    model: result.model
  };
}

export async function extractConversationWithGemini(transcript: string) {
  const prompt = buildExtractionPrompt(transcript, new Date().toISOString());
  const result = await callGemini([{ text: prompt }]);
  const raw = result.text;
  const parsed = parseGeminiJson(raw);
  const validated = conversationExtractionSchema.safeParse(parsed);

  if (validated.success) {
    return {
      raw,
      extraction: validated.data,
      model: result.model,
      provider: "google",
      promptVersion: EXTRACTION_PROMPT_VERSION
    };
  }

  const repairResult = await callGemini([{ text: buildRepairPrompt(raw, validated.error.message) }]);
  const repairedRaw = repairResult.text;
  const repaired = conversationExtractionSchema.parse(parseGeminiJson(repairedRaw));
  return {
    raw: repairedRaw,
    extraction: repaired,
    model: repairResult.model,
    provider: "google",
    promptVersion: EXTRACTION_PROMPT_VERSION
  };
}

export function validateExtraction(input: unknown): ConversationExtraction {
  return conversationExtractionSchema.parse(input);
}
