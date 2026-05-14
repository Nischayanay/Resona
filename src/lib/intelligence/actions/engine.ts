import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConversationExtraction } from "@/lib/ai/extraction-schema";

type SuggestedToolAction = ConversationExtraction["tool_suggestions"][number];

export function isCalendarWorthyToolSuggestion(suggestion: SuggestedToolAction) {
  const text = [suggestion.payload.title, suggestion.payload.description, suggestion.reason].filter(Boolean).join(" ").toLowerCase();
  return /\b(meet|meeting|appointment|call|interview|demo|sync|follow[-\s]?up|discussion|discuss|review)\b/.test(text);
}

function findLinkedAction(actionRows: { id: string; title: string }[], relatedActionTitle?: string) {
  if (!relatedActionTitle) {
    return null;
  }
  return actionRows.find((action) => action.title.toLowerCase() === relatedActionTitle.toLowerCase()) ?? null;
}

export async function suggestApprovedToolActions(params: {
  supabase: SupabaseClient;
  userId: string;
  sessionId: string;
  suggestions: SuggestedToolAction[];
  actionRows: { id: string; title: string }[];
}) {
  const { supabase, userId, sessionId, suggestions, actionRows } = params;
  const rows = suggestions
    .filter(isCalendarWorthyToolSuggestion)
    .map((suggestion) => {
      const linkedAction = findLinkedAction(actionRows, suggestion.payload.related_action_title);
      return {
        user_id: userId,
        session_id: sessionId,
        action_item_id: linkedAction?.id,
        tool_name: suggestion.tool,
        action_type: suggestion.action,
        payload_json: suggestion.payload,
        reason: suggestion.reason,
        status: "suggested",
        confidence: suggestion.confidence,
        requires_approval: true
      };
    });

  if (rows.length === 0) {
    return { suggestedCount: 0 };
  }

  const { error } = await supabase.from("tool_actions").insert(rows);
  if (error) {
    throw error;
  }
  return { suggestedCount: rows.length };
}
