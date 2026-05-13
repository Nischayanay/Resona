import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConversationExtraction } from "@/lib/ai/extraction-schema";

export function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function parseOptionalDate(value?: string) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

type PersonRow = {
  id: string;
  name: string;
  email?: string | null;
};

async function upsertPerson(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
  person: ConversationExtraction["people"][number]
): Promise<PersonRow> {
  const name = person.name.trim();
  const email = person.email?.toLowerCase();
  const baseQuery = supabase.from("people").select("id,name,email").eq("user_id", userId).limit(1);
  const { data: existingByEmail } = email ? await baseQuery.ilike("email", email).maybeSingle() : { data: null };

  let existing = existingByEmail as PersonRow | null;
  if (!existing) {
    const { data } = await supabase
      .from("people")
      .select("id,name,email")
      .eq("user_id", userId)
      .ilike("name", name)
      .limit(1)
      .maybeSingle();
    existing = data as PersonRow | null;
  }

  if (existing) {
    await supabase
      .from("people")
      .update({
        company: person.company ?? undefined,
        role: person.role ?? undefined,
        notes: person.relationship_context ?? undefined,
        confidence: person.confidence,
        updated_at: new Date().toISOString()
      })
      .eq("id", existing.id)
      .eq("user_id", userId);
  } else {
    const { data, error } = await supabase
      .from("people")
      .insert({
        user_id: userId,
        name,
        email,
        company: person.company,
        role: person.role,
        notes: person.relationship_context,
        confidence: person.confidence
      })
      .select("id,name,email")
      .single();

    if (error) {
      throw error;
    }
    existing = data as PersonRow;
  }

  await supabase.from("session_people").upsert(
    {
      user_id: userId,
      session_id: sessionId,
      person_id: existing.id,
      relationship_context: person.relationship_context,
      confidence: person.confidence
    },
    { onConflict: "session_id,person_id" }
  );

  return existing;
}

function findPerson(peopleByName: Map<string, PersonRow>, name?: string) {
  if (!name) {
    return null;
  }
  return peopleByName.get(normalizeName(name)) ?? null;
}

async function findActionItemForToolAction(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
  relatedActionTitle?: string
) {
  if (!relatedActionTitle) {
    return null;
  }
  const { data } = await supabase
    .from("action_items")
    .select("id,title")
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .ilike("title", relatedActionTitle)
    .limit(1)
    .maybeSingle();
  return data as { id: string } | null;
}

function isCalendarWorthyToolSuggestion(suggestion: ConversationExtraction["tool_suggestions"][number]) {
  const text = [suggestion.payload.title, suggestion.payload.description, suggestion.reason].filter(Boolean).join(" ").toLowerCase();
  return /\b(meet|meeting|appointment|call|interview|demo|sync|follow[-\s]?up|discussion|discuss|review)\b/.test(text);
}

export async function normalizeConversationExtraction(params: {
  supabase: SupabaseClient;
  userId: string;
  sessionId: string;
  extraction: ConversationExtraction;
}) {
  const { supabase, userId, sessionId, extraction } = params;

  const peopleByName = new Map<string, PersonRow>();
  for (const person of extraction.people) {
    const row = await upsertPerson(supabase, userId, sessionId, person);
    peopleByName.set(normalizeName(row.name), row);
    if (person.email) {
      peopleByName.set(normalizeName(person.email), row);
    }
  }

  const actionRows: { id: string; title: string }[] = [];
  for (const item of extraction.action_items) {
    const relatedPerson = findPerson(peopleByName, item.related_person);
    const dueAt = parseOptionalDate(item.due_date);
    const description = dueAt || !item.due_date ? item.description : [item.description, `Original due date: ${item.due_date}`].filter(Boolean).join("\n");

    const { data, error } = await supabase
      .from("action_items")
      .insert({
        user_id: userId,
        session_id: sessionId,
        title: item.title,
        description,
        owner_name: item.owner,
        related_person_id: relatedPerson?.id,
        due_at: dueAt,
        priority: item.priority,
        status: "pending",
        confidence: item.confidence
      })
      .select("id,title")
      .single();

    if (error) {
      throw error;
    }
    actionRows.push(data as { id: string; title: string });
  }

  if (extraction.opportunities.length > 0) {
    const { error } = await supabase.from("opportunities").insert(
      extraction.opportunities.map((opportunity) => ({
        user_id: userId,
        session_id: sessionId,
        type: opportunity.type,
        title: opportunity.title,
        description: opportunity.description,
        priority: opportunity.priority,
        confidence: opportunity.confidence
      }))
    );
    if (error) {
      throw error;
    }
  }

  if (extraction.memory_facts.length > 0) {
    const { error } = await supabase.from("memory_facts").insert(
      extraction.memory_facts.map((memory) => ({
        user_id: userId,
        session_id: sessionId,
        fact: memory.fact,
        category: memory.category,
        confidence: memory.confidence
      }))
    );
    if (error) {
      throw error;
    }
  }

  for (const followUp of extraction.follow_ups) {
    const person = findPerson(peopleByName, followUp.person_name);
    const suggestedDate = parseOptionalDate(followUp.suggested_date);
    const { error } = await supabase.from("follow_ups").insert({
      user_id: userId,
      session_id: sessionId,
      person_id: person?.id,
      reason: followUp.reason,
      suggested_message: followUp.suggested_message,
      suggested_date: suggestedDate,
      status: "suggested",
      confidence: followUp.confidence
    });
    if (error) {
      throw error;
    }
  }

  for (const suggestion of extraction.tool_suggestions) {
    if (!isCalendarWorthyToolSuggestion(suggestion)) {
      continue;
    }

    const linkedAction =
      (await findActionItemForToolAction(supabase, userId, sessionId, suggestion.payload.related_action_title)) ??
      actionRows.find((action) => action.title.toLowerCase() === suggestion.payload.related_action_title?.toLowerCase()) ??
      null;

    const { error } = await supabase.from("tool_actions").insert({
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
    });
    if (error) {
      throw error;
    }
  }

  await supabase
    .from("sessions")
    .update({
      summary: extraction.summary,
      updated_at: new Date().toISOString()
    })
    .eq("id", sessionId)
    .eq("user_id", userId);
}
