import { z } from "zod";

export const confidenceSchema = z.number().min(0).max(1);
export const prioritySchema = z.enum(["low", "medium", "high"]);
const optionalNonEmptyStringSchema = z.preprocess((value) => {
  if (typeof value === "string" && value.trim().length === 0) {
    return undefined;
  }
  return value;
}, z.string().min(1).optional());
const optionalEmailSchema = z.preprocess((value) => {
  if (typeof value === "string" && value.trim().length === 0) {
    return undefined;
  }
  return value;
}, z.string().email().optional());

export const personExtractionSchema = z.object({
  name: z.string().min(1),
  email: optionalEmailSchema,
  company: optionalNonEmptyStringSchema,
  role: optionalNonEmptyStringSchema,
  relationship_context: optionalNonEmptyStringSchema,
  confidence: confidenceSchema
});

export const actionItemExtractionSchema = z.object({
  title: z.string().min(1),
  description: optionalNonEmptyStringSchema,
  owner: optionalNonEmptyStringSchema,
  due_date: optionalNonEmptyStringSchema,
  related_person: optionalNonEmptyStringSchema,
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
  person_name: optionalNonEmptyStringSchema,
  reason: z.string().min(1),
  suggested_message: z.string().min(1),
  suggested_date: optionalNonEmptyStringSchema,
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
    description: optionalNonEmptyStringSchema,
    start_time: optionalNonEmptyStringSchema,
    end_time: optionalNonEmptyStringSchema,
    attendees: z
      .array(
        z.object({
          name: optionalNonEmptyStringSchema,
          email: optionalEmailSchema
        })
      )
      .optional(),
    related_person_name: optionalNonEmptyStringSchema,
    related_action_title: optionalNonEmptyStringSchema
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
