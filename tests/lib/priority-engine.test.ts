import { describe, expect, it } from "vitest";
import { buildPrioritySignals, buildSessionInsights } from "@/lib/intelligence/priority/engine";
import type { ConversationExtraction } from "@/lib/ai/extraction-schema";

const baseExtraction: ConversationExtraction = {
  summary: "Rahul mentioned an urgent AI infra internship follow-up.",
  people: [{ name: "Rahul", confidence: 0.9 }],
  topics: [{ name: "AI infrastructure", importance: "high", confidence: 0.9 }],
  action_items: [
    {
      title: "Send Rahul the GitHub repository",
      related_person: "Rahul",
      priority: "high",
      confidence: 0.95
    }
  ],
  opportunities: [
    {
      type: "internship",
      title: "AI infra internship",
      description: "Rahul mentioned an internship opening.",
      related_people: ["Rahul"],
      priority: "high",
      confidence: 0.86
    }
  ],
  risks: [{ title: "Missed follow-up risk", description: "Rahul expects a fast response.", severity: "high", confidence: 0.8 }],
  follow_ups: [
    {
      person_name: "Rahul",
      reason: "Continue internship conversation.",
      suggested_message: "Sharing my GitHub as discussed.",
      confidence: 0.88
    }
  ],
  unresolved_loops: [{ title: "Confirm internship next step", description: "Next step is not closed.", related_person: "Rahul", urgency: "high", confidence: 0.9 }],
  key_moments: [{ title: "Rahul offered to review work", description: "This creates a concrete opportunity.", importance: "high", confidence: 0.84 }],
  emotional_signals: [{ label: "High motivation", description: "The user sounded excited about the internship.", importance: "medium", confidence: 0.72 }],
  memory_facts: [{ fact: "Rahul works near AI infrastructure.", category: "person", related_people: ["Rahul"], confidence: 0.8 }],
  tool_suggestions: []
};

describe("priority engine", () => {
  it("ranks unresolved loops and high-priority work above lower signal items", () => {
    const signals = buildPrioritySignals(baseExtraction);

    expect(signals[0].rank).toBe(1);
    expect(signals[0].finalScore).toBeGreaterThanOrEqual(signals[signals.length - 1].finalScore);
    expect(signals.map((signal) => signal.entityType)).toContain("unresolved_loop");
  });

  it("creates clarity-first session insights from ranked signals and semantic extraction", () => {
    const signals = buildPrioritySignals(baseExtraction);
    const insights = buildSessionInsights(baseExtraction, signals);

    expect(insights[0].insightType).toBe("what_mattered");
    expect(insights.some((insight) => insight.insightType === "risk")).toBe(true);
    expect(insights.some((insight) => insight.insightType === "topic")).toBe(true);
  });
});
