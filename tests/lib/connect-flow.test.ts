import { describe, expect, it } from "vitest";
import { appendStatusToReturnPath, normalizeReturnPath } from "@/lib/calendar/connect-flow";

describe("calendar connect flow helpers", () => {
  it("keeps safe relative return paths", () => {
    expect(normalizeReturnPath("/conversations/abc")).toBe("/conversations/abc");
    expect(normalizeReturnPath("/conversations/abc?foo=bar")).toBe("/conversations/abc?foo=bar");
  });

  it("falls back for unsafe return paths", () => {
    expect(normalizeReturnPath("https://evil.example")).toBe("/home");
    expect(normalizeReturnPath("//evil.example")).toBe("/home");
    expect(normalizeReturnPath()).toBe("/home");
  });

  it("appends calendar status to the return path", () => {
    expect(appendStatusToReturnPath("/conversations/abc", "connected")).toBe("/conversations/abc?calendar=connected");
    expect(appendStatusToReturnPath("/conversations/abc?foo=bar", "oauth_denied")).toBe("/conversations/abc?foo=bar&calendar=oauth_denied");
    expect(appendStatusToReturnPath("/conversations/abc", "oauth_error", "google_oauth_testing")).toBe(
      "/conversations/abc?calendar=oauth_error&calendar_reason=google_oauth_testing"
    );
  });
});
