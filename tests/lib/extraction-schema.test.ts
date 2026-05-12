import { describe, expect, it } from "vitest";
import { conversationExtractionSchema } from "@/lib/ai/extraction-schema";

describe("conversationExtractionSchema", () => {
  it("accepts a valid Resona extraction payload", () => {
    const parsed = conversationExtractionSchema.parse({
      summary: "Met Rahul and discussed an internship opportunity.",
      people: [{ name: "Rahul", company: "AI Infra Co", confidence: 0.9 }],
      action_items: [
        {
          title: "Send GitHub and resume",
          related_person: "Rahul",
          priority: "high",
          confidence: 0.86
        }
      ],
      opportunities: [
        {
          type: "internship",
          title: "AI infra internship",
          description: "Rahul mentioned an internship opportunity.",
          priority: "high",
          confidence: 0.82
        }
      ],
      follow_ups: [
        {
          person_name: "Rahul",
          reason: "Continue internship conversation.",
          suggested_message: "Great meeting you. Sharing my GitHub and resume.",
          confidence: 0.78
        }
      ],
      memory_facts: [
        {
          fact: "Rahul works at an AI infra startup.",
          category: "person",
          related_people: ["Rahul"],
          confidence: 0.88
        }
      ],
      tool_suggestions: [
        {
          tool: "google_calendar",
          action: "create_event",
          reason: "A meeting was agreed for next Friday at 4 PM.",
          payload: {
            title: "Discuss internship role with Rahul",
            start_time: "2026-05-15T16:00:00+05:30",
            end_time: "2026-05-15T16:30:00+05:30",
            attendees: [{ name: "Rahul" }]
          },
          requires_approval: true,
          confidence: 0.91
        }
      ]
    });

    expect(parsed.people[0].name).toBe("Rahul");
    expect(parsed.tool_suggestions[0].requires_approval).toBe(true);
  });

  it("rejects tool actions that skip approval", () => {
    expect(() =>
      conversationExtractionSchema.parse({
        summary: "Meeting detected.",
        people: [],
        action_items: [],
        opportunities: [],
        follow_ups: [],
        memory_facts: [],
        tool_suggestions: [
          {
            tool: "google_calendar",
            action: "create_event",
            reason: "Meeting detected.",
            payload: { title: "Meeting" },
            requires_approval: false,
            confidence: 0.8
          }
        ]
      })
    ).toThrow();
  });
});
