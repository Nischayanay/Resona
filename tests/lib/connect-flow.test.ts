import { describe, expect, it } from "vitest";
import { appendStatusToReturnPath, normalizeReturnPath } from "@/lib/calendar/connect-flow";

describe("calendar connect flow helpers", () => {
  it("keeps safe relative return paths", () => {
    expect(normalizeReturnPath("/app/sessions/abc")).toBe("/app/sessions/abc");
    expect(normalizeReturnPath("/app/sessions/abc?foo=bar")).toBe("/app/sessions/abc?foo=bar");
  });

  it("falls back for unsafe return paths", () => {
    expect(normalizeReturnPath("https://evil.example")).toBe("/app");
    expect(normalizeReturnPath("//evil.example")).toBe("/app");
    expect(normalizeReturnPath()).toBe("/app");
  });

  it("appends calendar status to the return path", () => {
    expect(appendStatusToReturnPath("/app/sessions/abc", "connected")).toBe("/app/sessions/abc?calendar=connected");
    expect(appendStatusToReturnPath("/app/sessions/abc?foo=bar", "oauth_denied")).toBe("/app/sessions/abc?foo=bar&calendar=oauth_denied");
  });
});
