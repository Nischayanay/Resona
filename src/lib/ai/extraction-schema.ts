import { z } from "zod";

export const confidenceSchema = z.number().min(0).max(1);
export const prioritySchema = z.enum(["low", "medium", "high"]);

export const personExtractionSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  company: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
  relationship_context: z.string().min(1).optional(),
  confidence: confidenceSchema
});

export const actionItemExtractionSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1).optional(),
  owner: z.string().min(1).optional(),
  due_date: z.string().min(1).optional(),
  related_person: z.string().min(1).optional(),
  priority: prioritySchema,
  confidence: confidenceSchema
});

export const opportunityExtractionSchema = z.object({
  type: z.enum(["internship", "startup", "collaboration", "intro", "funding", "learning", "hiring", "research", "other"]),
  title: z.string().min(1),
  description: z.string().min(1),
  related_people: z.array(z.string().min(1)).optional(),
  priority: prioritySchema,
  confidence: confidenceSchema
});

export const followUpExtractionSchema = z.object({
  person_name: z.string().min(1).optional(),
  reason: z.string().min(1),
  suggested_message: z.string().min(1),
  suggested_date: z.string().min(1).optional(),
  confidence: confidenceSchema
});

export const memoryFactExtractionSchema = z.object({
  fact: z.string().min(1),
  category: z.enum(["person", "preference", "opportunity", "commitment", "topic", "decision", "relationship", "context"]),
  related_people: z.array(z.string().min(1)).optional(),
  confidence: confidenceSchema
});

export const toolSuggestionExtractionSchema = z.object({
  tool: z.literal("google_calendar"),
  action: z.literal("create_event"),
  reason: z.string().min(1),
  payload: z.object({
    title: z.string().min(1),
    description: z.string().min(1).optional(),
    start_time: z.string().min(1).optional(),
    end_time: z.string().min(1).optional(),
    attendees: z
      .array(
        z.object({
          name: z.string().min(1).optional(),
          email: z.string().email().optional()
        })
      )
      .optional(),
    related_person_name: z.string().min(1).optional(),
    related_action_title: z.string().min(1).optional()
  }),
  requires_approval: z.literal(true),
  confidence: confidenceSchema
});

export const conversationExtractionSchema = z.object({
  summary: z.string().min(1),
  people: z.array(personExtractionSchema).default([]),
  action_items: z.array(actionItemExtractionSchema).default([]),
  opportunities: z.array(opportunityExtractionSchema).default([]),
  follow_ups: z.array(followUpExtractionSchema).default([]),
  memory_facts: z.array(memoryFactExtractionSchema).default([]),
  tool_suggestions: z.array(toolSuggestionExtractionSchema).default([])
});

export type ConversationExtraction = z.infer<typeof conversationExtractionSchema>;
