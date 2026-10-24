import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/server";
import { answerWithGemini, parseGeminiJson } from "@/lib/ai/gemini";
import { createSupabaseServiceClient } from "@/lib/supabase/client";
import { badRequest, json, serverError, unauthorized } from "@/lib/http";

const requestSchema = z.object({ question: z.string().trim().min(3).max(500) });

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = requestSchema.parse(await request.json());
    const supabase = createSupabaseServiceClient();

    const [sessions, facts, actions, followUps, summaries] = await Promise.all([
      supabase.from("sessions").select("id,title,created_at,summary,status").eq("user_id", user.id).eq("status", "completed").order("created_at", { ascending: false }).limit(30),
      supabase.from("memory_facts").select("session_id,fact,category,confidence,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
      supabase.from("action_items").select("session_id,title,description,owner_name,due_date,status").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
      supabase.from("follow_ups").select("session_id,person_name,reason,suggested_message,suggested_date,status").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
      supabase.from("long_term_memory_summaries").select("source_session_id,summary,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50)
    ]);
    for (const result of [sessions, facts, actions, followUps, summaries]) {
      if (result.error) throw result.error;
    }

    const sourceIds = new Set((sessions.data ?? []).map((session) => session.id));
    const context = JSON.stringify({
      sessions: sessions.data,
      memory_facts: facts.data,
      action_items: actions.data,
      follow_ups: followUps.data,
      summaries: summaries.data
    });
    const raw = await answerWithGemini(`You are Vynora's meeting memory assistant. Answer the user's question using ONLY the supplied memory context. Never invent facts. If the context is insufficient, say so plainly. Be concise and practical. Return JSON only: {"answer":"string","source_session_ids":["uuid"],"open_commitments":[{"title":"string","owner":"string or null","due_date":"string or null"}]}. User question: ${body.question}\nMemory context: ${context}`);
    const parsed = parseGeminiJson(raw) as { answer?: string; source_session_ids?: string[]; open_commitments?: unknown[] };
    const safeSourceIds = (parsed.source_session_ids ?? []).filter((id) => sourceIds.has(id));
    return json({ answer: parsed.answer ?? "I could not find enough evidence in your conversations.", source_session_ids: safeSourceIds, open_commitments: parsed.open_commitments ?? [] });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorized();
    if (error instanceof z.ZodError) return badRequest("Ask a question about your conversations.", error.flatten());
    return serverError(error);
  }
}
