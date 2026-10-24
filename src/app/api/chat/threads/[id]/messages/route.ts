import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/server";
import { answerWithGemini, parseGeminiJson } from "@/lib/ai/gemini";
import { badRequest, json, notFound, serverError, unauthorized } from "@/lib/http";
import { createSupabaseServiceClient } from "@/lib/supabase/client";
import { devMessages } from "@/lib/chat/dev-store";

const messageSchema = z.object({ content: z.string().trim().min(1).max(6000), references: z.array(z.object({ type: z.string(), id: z.string(), label: z.string() })).max(12).default([]) });
const DEV_AUTH_BYPASS = process.env.DEV_AUTH_BYPASS === "true" && process.env.NODE_ENV !== "production";

function chatSchemaError(error: unknown) {
  return error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "42P01";
}

export async function GET(request: NextRequest, routeContext: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const { id } = await routeContext.params;
    if (DEV_AUTH_BYPASS && user.id === "local-dev-user") return json({ messages: devMessages.get(id) ?? [] });
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase.from("chat_messages").select("id,role,content,references_json,created_at").eq("user_id", user.id).eq("thread_id", id).order("created_at", { ascending: true });
    if (error) throw error;
    return json({ messages: data ?? [] });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorized();
    if (chatSchemaError(error)) return json({ error: "CHAT_SCHEMA_NOT_READY", message: "Donna chat is not initialized in Supabase yet. Apply the Donna chat migration, then refresh this page." }, 503);
    return serverError(error);
  }
}

export async function POST(request: NextRequest, routeContext: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const { id } = await routeContext.params;
    const body = messageSchema.parse(await request.json());
    if (DEV_AUTH_BYPASS && user.id === "local-dev-user") {
      const createdAt = new Date().toISOString();
      const current = devMessages.get(id) ?? [];
      const userMessage = { id: crypto.randomUUID(), role: "user" as const, content: body.content, references_json: body.references, created_at: createdAt };
      const assistantMessage = { id: crypto.randomUUID(), role: "assistant" as const, content: "Local Donna is connected. Apply the Supabase migration and add your model key to test grounded answers.", references_json: [], created_at: new Date().toISOString() };
      devMessages.set(id, [...current, userMessage, assistantMessage]);
      return json({ messages: [userMessage, assistantMessage], actions: [], source_session_ids: [] });
    }
    const supabase = createSupabaseServiceClient();
    const { data: thread, error: threadError } = await supabase.from("chat_threads").select("id,title").eq("id", id).eq("user_id", user.id).maybeSingle();
    if (threadError) throw threadError;
    if (!thread) return notFound("Chat");

    const { data: history, error: historyError } = await supabase.from("chat_messages").select("role,content,references_json").eq("thread_id", id).eq("user_id", user.id).order("created_at", { ascending: true }).limit(24);
    if (historyError) throw historyError;
    const referenceIds = new Set(body.references.filter((reference) => reference.type === "conversation").map((reference) => reference.id));
    const [sessions, facts, actions] = referenceIds.size === 0
      ? [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }]
      : await Promise.all([
          supabase.from("sessions").select("id,title,summary,created_at,status").eq("user_id", user.id).in("id", [...referenceIds]).limit(12),
          supabase.from("memory_facts").select("session_id,fact,category").eq("user_id", user.id).in("session_id", [...referenceIds]).limit(80),
          supabase.from("action_items").select("session_id,title,description,owner_name,due_at,status").eq("user_id", user.id).in("session_id", [...referenceIds]).limit(80)
        ]);
    for (const result of [sessions, facts, actions]) if (result.error) throw result.error;

    const modelContext = JSON.stringify({ references: body.references, conversations: sessions.data, memory_facts: facts.data, action_items: actions.data });
    const prompt = `You are Donna, a continuous personal AI workspace. Answer using only the supplied context and chat history. If evidence is missing, say so. Be direct and useful. Return JSON only: {"answer":"string","actions":[{"title":"string","description":"string","type":"review|draft|remind|schedule"}],"source_session_ids":["uuid"]}. Chat history: ${JSON.stringify(history?.slice(-12) ?? [])}\nUser message: ${body.content}\nContext: ${modelContext}`;
    const raw = await answerWithGemini(prompt);
    const parsed = parseGeminiJson(raw) as { answer?: string; actions?: unknown[]; source_session_ids?: string[] };
    const userMessage = { user_id: user.id, thread_id: id, role: "user", content: body.content, references_json: body.references };
    const assistantMessage = { user_id: user.id, thread_id: id, role: "assistant", content: parsed.answer ?? "I could not find enough context to answer that.", references_json: (parsed.source_session_ids ?? []).map((sourceId) => ({ type: "conversation", id: sourceId })) };
    const { data: saved, error: saveError } = await supabase.from("chat_messages").insert([userMessage, assistantMessage]).select("id,role,content,references_json,created_at");
    if (saveError) throw saveError;
    await supabase.from("chat_threads").update({ title: thread.title === "New chat" ? body.content.slice(0, 52) : thread.title, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id);
    return json({ messages: saved ?? [], actions: parsed.actions ?? [], source_session_ids: parsed.source_session_ids ?? [] });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorized();
    if (error instanceof z.ZodError) return badRequest("Write a message before sending.", error.flatten());
    if (chatSchemaError(error)) return json({ error: "CHAT_SCHEMA_NOT_READY", message: "Donna chat is not initialized in Supabase yet. Apply the Donna chat migration, then refresh this page." }, 503);
    return serverError(error);
  }
}
