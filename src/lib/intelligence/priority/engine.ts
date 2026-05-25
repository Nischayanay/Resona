import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConversationExtraction } from "@/lib/ai/extraction-schema";

type PriorityLevel = "low" | "medium" | "high";
type InsightType = "what_mattered" | "key_moment" | "risk" | "unresolved_loop" | "commitment" | "topic" | "emotional_signal";

export type PrioritySignal = {
  entityType: string;
  entityId?: string;
  title: string;
  reason: string;
  urgencyScore: number;
  importanceScore: number;
  confidenceScore: number;
  relationshipScore: number;
  recencyScore: number;
  burdenScore: number;
  finalScore: number;
  rank: number;
};

export type SessionInsight = {
  insightType: InsightType;
  title: string;
  description?: string;
  priority: PriorityLevel;
  priorityScore: number;
  signalReason?: string;
  source: unknown;
  confidence: number;
};

const levelScores: Record<PriorityLevel, number> = {
  low: 0.25,
  medium: 0.6,
  high: 1
};

function scoreLevel(level?: PriorityLevel) {
  return levelScores[level ?? "medium"];
}

function clampScore(value: number) {
  return Math.max(0, Math.min(1, Number(value.toFixed(3))));
}

function finalPriorityScore(params: {
  urgency: number;
  importance: number;
  confidence: number;
  relationship: number;
  recency: number;
  burden: number;
}) {
  return clampScore(
    params.urgency * 0.26 +
      params.importance * 0.26 +
      params.confidence * 0.18 +
      params.relationship * 0.12 +
      params.recency * 0.08 +
      params.burden * 0.1
  );
}

function makeSignal(params: {
  entityType: string;
  title: string;
  reason: string;
  urgency?: PriorityLevel;
  importance?: PriorityLevel;
  confidence: number;
  relationshipCount?: number;
  burden?: number;
}) {
  const urgencyScore = scoreLevel(params.urgency);
  const importanceScore = scoreLevel(params.importance);
  const relationshipScore = Math.min(1, (params.relationshipCount ?? 0) * 0.25);
  const recencyScore = 1;
  const burdenScore = params.burden ?? 0.5;
  const confidenceScore = clampScore(params.confidence);
  return {
    entityType: params.entityType,
    title: params.title,
    reason: params.reason,
    urgencyScore,
    importanceScore,
    confidenceScore,
    relationshipScore,
    recencyScore,
    burdenScore,
    finalScore: finalPriorityScore({
      urgency: urgencyScore,
      importance: importanceScore,
      confidence: confidenceScore,
      relationship: relationshipScore,
      recency: recencyScore,
      burden: burdenScore
    }),
    rank: 0
  };
}

export function buildPrioritySignals(extraction: ConversationExtraction): PrioritySignal[] {
  const signals: Omit<PrioritySignal, "rank">[] = [
    ...extraction.action_items.map((item) =>
      makeSignal({
        entityType: "action_item",
        title: item.title,
        reason: item.description ?? "Action item extracted from conversation.",
        urgency: item.priority,
        importance: item.priority,
        confidence: item.confidence,
        relationshipCount: item.related_person ? 1 : 0,
        burden: item.owner ? 0.7 : 0.5
      })
    ),
    ...extraction.opportunities.map((opportunity) =>
      makeSignal({
        entityType: "opportunity",
        title: opportunity.title,
        reason: opportunity.description,
        urgency: opportunity.priority,
        importance: opportunity.priority,
        confidence: opportunity.confidence,
        relationshipCount: opportunity.related_people?.length ?? 0,
        burden: 0.35
      })
    ),
    ...extraction.follow_ups.map((followUp) =>
      makeSignal({
        entityType: "follow_up",
        title: followUp.reason,
        reason: followUp.suggested_message,
        urgency: followUp.suggested_date ? "high" : "medium",
        importance: "high",
        confidence: followUp.confidence,
        relationshipCount: followUp.person_name ? 1 : 0,
        burden: 0.8
      })
    ),
    ...extraction.risks.map((risk) =>
      makeSignal({
        entityType: "risk",
        title: risk.title,
        reason: risk.description,
        urgency: risk.severity,
        importance: risk.severity,
        confidence: risk.confidence,
        relationshipCount: risk.related_people?.length ?? 0,
        burden: 0.9
      })
    ),
    ...extraction.unresolved_loops.map((loop) =>
      makeSignal({
        entityType: "unresolved_loop",
        title: loop.title,
        reason: loop.description,
        urgency: loop.urgency,
        importance: "high",
        confidence: loop.confidence,
        relationshipCount: loop.related_person ? 1 : 0,
        burden: 1
      })
    ),
    ...extraction.key_moments.map((moment) =>
      makeSignal({
        entityType: "key_moment",
        title: moment.title,
        reason: moment.description,
        urgency: moment.importance,
        importance: moment.importance,
        confidence: moment.confidence,
        relationshipCount: moment.related_people?.length ?? 0,
        burden: 0.2
      })
    )
  ];

  return signals
    .sort((a, b) => b.finalScore - a.finalScore)
    .map((signal, index) => ({ ...signal, rank: index + 1 }));
}

export function buildSessionInsights(extraction: ConversationExtraction, signals: PrioritySignal[]): SessionInsight[] {
  const topSignals: SessionInsight[] = signals.slice(0, 5).map((signal) => ({
    insightType: "what_mattered" as const,
    title: signal.title,
    description: signal.reason,
    priority: (signal.finalScore >= 0.75 ? "high" : signal.finalScore >= 0.45 ? "medium" : "low") as PriorityLevel,
    priorityScore: signal.finalScore,
    signalReason: `Ranked #${signal.rank} by Vynora priority scoring.`,
    source: signal,
    confidence: signal.confidenceScore
  }));

  const typedInsights: SessionInsight[] = [
    ...extraction.topics.map((topic) => ({
      insightType: "topic" as const,
      title: topic.name,
      description: topic.summary,
      priority: topic.importance,
      priorityScore: scoreLevel(topic.importance),
      source: topic,
      confidence: topic.confidence
    })),
    ...extraction.key_moments.map((moment) => ({
      insightType: "key_moment" as const,
      title: moment.title,
      description: moment.description,
      priority: moment.importance,
      priorityScore: scoreLevel(moment.importance),
      source: moment,
      confidence: moment.confidence
    })),
    ...extraction.risks.map((risk) => ({
      insightType: "risk" as const,
      title: risk.title,
      description: risk.description,
      priority: risk.severity,
      priorityScore: scoreLevel(risk.severity),
      source: risk,
      confidence: risk.confidence
    })),
    ...extraction.unresolved_loops.map((loop) => ({
      insightType: "unresolved_loop" as const,
      title: loop.title,
      description: loop.description,
      priority: loop.urgency,
      priorityScore: scoreLevel(loop.urgency),
      source: loop,
      confidence: loop.confidence
    })),
    ...extraction.emotional_signals.map((signal) => ({
      insightType: "emotional_signal" as const,
      title: signal.label,
      description: signal.description,
      priority: signal.importance,
      priorityScore: scoreLevel(signal.importance),
      source: signal,
      confidence: signal.confidence
    }))
  ];

  return [...topSignals, ...typedInsights];
}

export async function persistPriorityOutputs(params: {
  supabase: SupabaseClient;
  userId: string;
  sessionId: string;
  signals: PrioritySignal[];
  insights: SessionInsight[];
}) {
  const { supabase, userId, sessionId, signals, insights } = params;

  if (signals.length > 0) {
    const { error } = await supabase.from("priority_signals").insert(
      signals.map((signal) => ({
        user_id: userId,
        session_id: sessionId,
        entity_type: signal.entityType,
        entity_id: signal.entityId,
        title: signal.title,
        reason: signal.reason,
        urgency_score: signal.urgencyScore,
        importance_score: signal.importanceScore,
        confidence_score: signal.confidenceScore,
        relationship_score: signal.relationshipScore,
        recency_score: signal.recencyScore,
        burden_score: signal.burdenScore,
        final_score: signal.finalScore,
        rank: signal.rank
      }))
    );
    if (error) {
      throw error;
    }
  }

  if (insights.length > 0) {
    const { error } = await supabase.from("session_insights").insert(
      insights.map((insight) => ({
        user_id: userId,
        session_id: sessionId,
        insight_type: insight.insightType,
        title: insight.title,
        description: insight.description,
        priority: insight.priority,
        priority_score: insight.priorityScore,
        signal_reason: insight.signalReason,
        source_json: insight.source,
        confidence: insight.confidence
      }))
    );
    if (error) {
      throw error;
    }
  }
}
