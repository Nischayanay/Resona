import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { json, notFound, serverError, unauthorized } from "@/lib/http";
import { createSupabaseServiceClient } from "@/lib/supabase/client";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;
    const supabase = createSupabaseServiceClient();

    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (sessionError) {
      throw sessionError;
    }
    if (!session) {
      return notFound("Session");
    }

    const [transcript, people, actionItems, opportunities, memoryFacts, followUps, toolActions, sessionInsights, prioritySignals] = await Promise.all([
      supabase.from("transcripts").select("*").eq("session_id", id).eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("session_people").select("relationship_context,confidence,people(*)").eq("session_id", id).eq("user_id", user.id),
      supabase.from("action_items").select("*").eq("session_id", id).eq("user_id", user.id).order("created_at", { ascending: true }),
      supabase.from("opportunities").select("*").eq("session_id", id).eq("user_id", user.id).order("created_at", { ascending: true }),
      supabase.from("memory_facts").select("*").eq("session_id", id).eq("user_id", user.id).order("created_at", { ascending: true }),
      supabase.from("follow_ups").select("*").eq("session_id", id).eq("user_id", user.id).order("created_at", { ascending: true }),
      supabase.from("tool_actions").select("*").eq("session_id", id).eq("user_id", user.id).order("created_at", { ascending: true }),
      supabase.from("session_insights").select("*").eq("session_id", id).eq("user_id", user.id).order("priority_score", { ascending: false }),
      supabase.from("priority_signals").select("*").eq("session_id", id).eq("user_id", user.id).order("rank", { ascending: true })
    ]);

    for (const result of [transcript, people, actionItems, opportunities, memoryFacts, followUps, toolActions, sessionInsights, prioritySignals]) {
      if (result.error) {
        throw result.error;
      }
    }

    return json({
      session,
      transcript: transcript.data,
      people: people.data?.map((row: any) => ({ ...row.people, relationship_context: row.relationship_context, session_confidence: row.confidence })) ?? [],
      action_items: actionItems.data ?? [],
      opportunities: opportunities.data ?? [],
      memory_facts: memoryFacts.data ?? [],
      follow_ups: followUps.data ?? [],
      tool_actions: toolActions.data ?? [],
      session_insights: sessionInsights.data ?? [],
      priority_signals: prioritySignals.data ?? []
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return serverError(error);
  }
}
