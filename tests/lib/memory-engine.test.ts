import { describe, expect, it } from "vitest";
import type { ConversationExtraction } from "@/lib/ai/extraction-schema";
import { buildMemoryEdges, buildPersonMemoryProfiles } from "@/lib/intelligence/memory/engine";
import { normalizeName, type NormalizedConversationContext } from "@/lib/processing/normalization";

const extraction: ConversationExtraction = {
  summary: "Rahul discussed AI infra and an internship opening.",
  people: [{ name: "Rahul Sharma", company: "Infra Labs", relationship_context: "Met at hackathon.", confidence: 0.9 }],
  topics: [{ name: "AI infrastructure", related_people: ["Rahul Sharma"], importance: "high", confidence: 0.88 }],
  action_items: [],
  opportunities: [
    {
      type: "internship",
      title: "Infra Labs internship",
      description: "Rahul mentioned an internship opening.",
      related_people: ["Rahul Sharma"],
      priority: "high",
      confidence: 0.82
    }
  ],
  risks: [],
  follow_ups: [],
  unresolved_loops: [{ title: "Send portfolio", description: "Portfolio is still pending.", related_person: "Rahul Sharma", urgency: "high", confidence: 0.9 }],
  key_moments: [],
  emotional_signals: [],
  memory_facts: [{ fact: "Rahul is interested in AI infra.", category: "person", related_people: ["Rahul Sharma"], confidence: 0.85 }],
  tool_suggestions: []
};

const context: NormalizedConversationContext = {
  people: [{ id: "11111111-1111-4111-8111-111111111111", name: "Rahul Sharma" }],
  peopleByName: new Map([[normalizeName("Rahul Sharma"), { id: "11111111-1111-4111-8111-111111111111", name: "Rahul Sharma" }]]),
  actionRows: []
};

describe("memory engine", () => {
  it("builds evolving person memory profiles from extracted relationship context", () => {
    const profiles = buildPersonMemoryProfiles(extraction, context);

    expect(profiles).toHaveLength(1);
    expect(profiles[0].summary).toContain("Met at hackathon");
    expect(profiles[0].openLoopCount).toBe(1);
    expect(profiles[0].opportunityCount).toBe(1);
  });

  it("creates graph edges between sessions, people, topics, and opportunities", () => {
    const edges = buildMemoryEdges(extraction, context, "22222222-2222-4222-8222-222222222222");

    expect(edges.some((edge) => edge.relation_type === "mentioned_person")).toBe(true);
    expect(edges.some((edge) => edge.relation_type === "interested_in")).toBe(true);
    expect(edges.some((edge) => edge.relation_type === "connected_to_opportunity")).toBe(true);
  });
});
