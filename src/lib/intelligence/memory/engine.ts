import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConversationExtraction } from "@/lib/ai/extraction-schema";
import { normalizeName, type NormalizedConversationContext } from "@/lib/processing/normalization";

type PersonMemoryProfile = {
  personId: string;
  summary: string;
  relationshipContext?: string;
  openLoopCount: number;
  opportunityCount: number;
  memoryJson: Record<string, unknown>;
};

export function buildPersonMemoryProfiles(extraction: ConversationExtraction, context: NormalizedConversationContext): PersonMemoryProfile[] {
  return context.people.map((person) => {
    const extractedPerson = extraction.people.find((candidate) => normalizeName(candidate.name) === normalizeName(person.name));
    const relatedName = extractedPerson?.name ?? person.name;
    const openLoopCount = extraction.unresolved_loops.filter((loop) => normalizeName(loop.related_person ?? "") === normalizeName(relatedName)).length;
    const opportunityCount = extraction.opportunities.filter((opportunity) =>
      opportunity.related_people?.some((name) => normalizeName(name) === normalizeName(relatedName))
    ).length;
    const memoryFacts = extraction.memory_facts.filter((fact) => fact.related_people?.some((name) => normalizeName(name) === normalizeName(relatedName)));

    return {
      personId: person.id,
      summary: [extractedPerson?.relationship_context, person.company, person.role].filter(Boolean).join(" ") || `Conversation memory for ${person.name}.`,
      relationshipContext: extractedPerson?.relationship_context,
      openLoopCount,
      opportunityCount,
      memoryJson: {
        latest_relationship_context: extractedPerson?.relationship_context,
        memory_facts: memoryFacts.map((fact) => fact.fact),
        topics: extraction.topics
          .filter((topic) => topic.related_people?.some((name) => normalizeName(name) === normalizeName(relatedName)))
          .map((topic) => topic.name)
      }
    };
  });
}

export function buildMemoryEdges(extraction: ConversationExtraction, context: NormalizedConversationContext, sessionId: string) {
  const edges = [];
  for (const person of context.people) {
    edges.push({
      source_type: "session",
      source_id: sessionId,
      target_type: "person",
      target_id: person.id,
      relation_type: "mentioned_person",
      weight: 0.7,
      evidence_session_id: sessionId,
      evidence: person.name,
      confidence: 0.8
    });
  }

  for (const topic of extraction.topics) {
    for (const relatedPerson of topic.related_people ?? []) {
      const person = context.peopleByName.get(normalizeName(relatedPerson));
      if (!person) {
        continue;
      }
      edges.push({
        source_type: "person",
        source_id: person.id,
        target_type: "topic",
        target_id: null,
        relation_type: "interested_in",
        weight: topic.importance === "high" ? 0.9 : 0.6,
        evidence_session_id: sessionId,
        evidence: topic.summary ?? topic.name,
        confidence: topic.confidence
      });
    }
  }

  for (const opportunity of extraction.opportunities) {
    for (const relatedPerson of opportunity.related_people ?? []) {
      const person = context.peopleByName.get(normalizeName(relatedPerson));
      if (!person) {
        continue;
      }
      edges.push({
        source_type: "person",
        source_id: person.id,
        target_type: "opportunity",
        target_id: null,
        relation_type: "connected_to_opportunity",
        weight: opportunity.priority === "high" ? 1 : 0.65,
        evidence_session_id: sessionId,
        evidence: opportunity.description,
        confidence: opportunity.confidence
      });
    }
  }

  return edges;
}

export async function updateConversationMemory(params: {
  supabase: SupabaseClient;
  userId: string;
  sessionId: string;
  extraction: ConversationExtraction;
  context: NormalizedConversationContext;
}) {
  const { supabase, userId, sessionId, extraction, context } = params;
  const profiles = buildPersonMemoryProfiles(extraction, context);

  for (const profile of profiles) {
    const { data: existing, error: existingError } = await supabase
      .from("person_memory_profiles")
      .select("id,interaction_count")
      .eq("user_id", userId)
      .eq("person_id", profile.personId)
      .maybeSingle();
    if (existingError) {
      throw existingError;
    }

    const { error } = await supabase.from("person_memory_profiles").upsert(
      {
        id: (existing as { id?: string } | null)?.id,
        user_id: userId,
        person_id: profile.personId,
        summary: profile.summary,
        relationship_context: profile.relationshipContext,
        last_interaction_at: new Date().toISOString(),
        interaction_count: ((existing as { interaction_count?: number } | null)?.interaction_count ?? 0) + 1,
        open_loop_count: profile.openLoopCount,
        opportunity_count: profile.opportunityCount,
        memory_json: profile.memoryJson,
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id,person_id" }
    );
    if (error) {
      throw error;
    }
  }

  const edges = buildMemoryEdges(extraction, context, sessionId);
  if (edges.length > 0) {
    const { error } = await supabase.from("memory_edges").insert(edges.map((edge) => ({ ...edge, user_id: userId })));
    if (error) {
      throw error;
    }
  }

  const { error: summaryError } = await supabase.from("long_term_memory_summaries").insert({
    user_id: userId,
    summary_type: "session_compression",
    subject_type: "session",
    subject_id: sessionId,
    summary: extraction.summary,
    source_session_id: sessionId,
    source_counts: {
      people: extraction.people.length,
      topics: extraction.topics.length,
      actions: extraction.action_items.length,
      opportunities: extraction.opportunities.length,
      risks: extraction.risks.length,
      unresolved_loops: extraction.unresolved_loops.length
    }
  });
  if (summaryError) {
    throw summaryError;
  }

  return { profileCount: profiles.length, edgeCount: edges.length };
}
