import { describe, expect, it } from "vitest";
import { cleanTranscriptText } from "@/lib/intelligence/transcription/engine";

describe("transcription engine", () => {
  it("keeps transcript cleanup deterministic and source-safe", () => {
    expect(cleanTranscriptText("  Hello    Rahul.\n\n\nWe should meet.  ")).toBe("Hello Rahul.\n\nWe should meet.");
  });
});
