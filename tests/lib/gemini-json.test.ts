import { describe, expect, it } from "vitest";
import { parseGeminiJson } from "@/lib/ai/gemini";

describe("parseGeminiJson", () => {
  it("parses the first complete JSON object when Gemini appends extra text", () => {
    const parsed = parseGeminiJson('{"summary":"Ready","nested":{"text":"brace } inside string"}}\n{"extra":true}');

    expect(parsed).toEqual({
      summary: "Ready",
      nested: {
        text: "brace } inside string"
      }
    });
  });
});
