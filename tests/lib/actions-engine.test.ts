import { describe, expect, it } from "vitest";
import { isCalendarWorthyToolSuggestion } from "@/lib/intelligence/actions/engine";
import type { ConversationExtraction } from "@/lib/ai/extraction-schema";

type ToolSuggestion = ConversationExtraction["tool_suggestions"][number];

describe("action engine", () => {
  it("keeps calendar actions limited to real meetings and calls", () => {
    const meeting: ToolSuggestion = {
      tool: "google_calendar",
      action: "create_event",
      reason: "A follow-up call was agreed.",
      payload: { title: "Follow-up call with Rahul" },
      requires_approval: true,
      confidence: 0.9
    };
    const personalRoutine: ToolSuggestion = {
      tool: "google_calendar",
      action: "create_event",
      reason: "Meditation was mentioned.",
      payload: { title: "Morning meditation" },
      requires_approval: true,
      confidence: 0.9
    };

    expect(isCalendarWorthyToolSuggestion(meeting)).toBe(true);
    expect(isCalendarWorthyToolSuggestion(personalRoutine)).toBe(false);
  });
});
