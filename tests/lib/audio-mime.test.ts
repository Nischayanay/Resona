import { describe, expect, it } from "vitest";
import { normalizeAudioMimeType } from "@/lib/audio/mime";

describe("normalizeAudioMimeType", () => {
  it("accepts browser m4a aliases as audio/mp4", () => {
    expect(normalizeAudioMimeType("audio/x-m4a", "New Recording.m4a")).toBe("audio/mp4");
    expect(normalizeAudioMimeType("audio/m4a", "New Recording.m4a")).toBe("audio/mp4");
  });

  it("falls back to supported file extensions when the browser MIME type is unknown", () => {
    expect(normalizeAudioMimeType("application/octet-stream", "voice-note.m4a")).toBe("audio/mp4");
    expect(normalizeAudioMimeType("", "meeting.wav")).toBe("audio/wav");
  });

  it("rejects unsupported files", () => {
    expect(normalizeAudioMimeType("application/pdf", "notes.pdf")).toBeNull();
  });
});

