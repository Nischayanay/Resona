import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/server";
import { answerWithGemini, parseGeminiJson } from "@/lib/ai/gemini";
import { badRequest, json, notFound, serverError, unauthorized } from "@/lib/http";
import { createSupabaseServiceClient } from "@/lib/supabase/client";
import {
  buildDonnaPrompt,
  chatTemplateSchema,
  donnaAnswerSchema,
  donnaReferenceSkills
} from "@/lib/chat/prompt";

const referenceSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("conversation"), id: z.string().min(1).max(100), label: z.string().trim().min(1).max(160) }),
  z.object({ type: z.literal("skill"), id: z.enum(["follow-up", "meeting-brief", "decision-log"]), label: z.string().trim().min(1).max(100) }),
  z.object({
    type: z.literal("file"),
    id: z.string().min(1).max(100),
    label: z.string().trim().min(1).max(160).regex(/\.(txt|md|csv|json|log)$/i, "Reference files must be plain text, Markdown, CSV, JSON, or LOG."),
    content: z.string().min(1).max(25_000)
  })
]);

const messageSchema = z.object({
  content: z.string().trim().min(1).max(6000),
  references: z.array(referenceSchema).max(12).default([]),
  template: chatTemplateSchema.default("freeform")
}).superRefine((body, context) => {
  const files = body.references.filter((reference) => reference.type === "file");
  if (files.length > 4) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Attach no more than four reference files.", path: ["references"] });
  }
  if (files.reduce((total, file) => total + file.content.length, 0) > 50_000) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Reference files must total 50,000 characters or less.", path: ["references"] });
  }
  if (body.references.filter((reference) => reference.type === "conversation").length > 8) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Select no more than eight conversations.", path: ["references"] });
  }
});

function chatSchemaError(error: unknown) {
  return error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "42P01";
}

export async function GET(request: NextRequest, routeContext: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const { id } = await routeContext.params;
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
    const fileReferences = body.references.filter((reference) => reference.type === "file");
    const skills = body.references.flatMap((reference) => {
      if (reference.type !== "skill") return [];
      const skill = donnaReferenceSkills.find((item) => item.id === reference.id);
      return skill ? [skill.instruction] : [];
    });
    const conversationIds = body.references.filter((reference) => reference.type === "conversation").map((reference) => reference.id);
    const savedReferences = body.references.map(({ type, id: referenceId, label }) => ({ type, id: referenceId, label }));

    const supabase = createSupabaseServiceClient();
    const { data: thread, error: threadError } = await supabase.from("chat_threads").select("id,title").eq("id", id).eq("user_id", user.id).maybeSingle();
    if (threadError) throw threadError;
    if (!thread) return notFound("Chat");

    const { data: history, error: historyError } = await supabase.from("chat_messages").select("role,content").eq("thread_id", id).eq("user_id", user.id).order("created_at", { ascending: true }).limit(24);
    if (historyError) throw historyError;

    const [sessions, transcripts, facts, actions, followUps] = conversationIds.length === 0
      ? [
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null }
        ]
      : await Promise.all([
          supabase.from("sessions").select("id,title,summary,created_at,status").eq("user_id", user.id).in("id", conversationIds).limit(8),
          supabase.from("transcripts").select("session_id,raw_text,language,provider").eq("user_id", user.id).in("session_id", conversationIds).order("created_at", { ascending: false }).limit(8),
          supabase.from("memory_facts").select("session_id,fact,category").eq("user_id", user.id).in("session_id", conversationIds).limit(80),
          supabase.from("action_items").select("session_id,title,description,owner_name,due_at,status").eq("user_id", user.id).in("session_id", conversationIds).limit(80),
          supabase.from("follow_ups").select("session_id,reason,suggested_message,suggested_date,status").eq("user_id", user.id).in("session_id", conversationIds).limit(80)
        ]);
    for (const result of [sessions, transcripts, facts, actions, followUps]) if (result.error) throw result.error;
    if ((sessions.data?.length ?? 0) !== new Set(conversationIds).size) return badRequest("One or more selected conversations are unavailable.");

    const selectedIds = new Set(sessions.data?.map((conversation) => conversation.id) ?? []);
    const context = {
      conversations: sessions.data,
      transcripts: transcripts.data?.map((transcript) => ({ ...transcript, raw_text: transcript.raw_text.slice(0, 25_000) })),
      memory_facts: facts.data,
      action_items: actions.data,
      follow_ups: followUps.data,
      reference_files: fileReferences.map(({ label, content }) => ({ label, content }))
    };
    const raw = await answerWithGemini(buildDonnaPrompt({
      content: body.content,
      template: body.template,
      history: (history ?? []).slice(-12),
      context,
      skills
    }));
    const parsed = donnaAnswerSchema.parse(parseGeminiJson(raw));
    const citedSessionIds = parsed.source_session_ids.filter((sourceId) => selectedIds.has(sourceId));
    const userMessage = { user_id: user.id, thread_id: id, role: "user", content: body.content, references_json: savedReferences };
    const assistantMessage = { user_id: user.id, thread_id: id, role: "assistant", content: parsed.answer, references_json: citedSessionIds.map((sourceId) => ({ type: "conversation", id: sourceId })) };
    const { error: updateError } = await supabase.from("chat_threads").update({ title: thread.title === "New chat" ? body.content.slice(0, 52) : thread.title, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id);
    if (updateError) throw updateError;
    const { data: saved, error: saveError } = await supabase.from("chat_messages").insert([userMessage, assistantMessage]).select("id,role,content,references_json,created_at");
    if (saveError) throw saveError;
    return json({ messages: saved ?? [], actions: [], source_session_ids: citedSessionIds });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorized();
    if (error instanceof z.ZodError) return badRequest("Invalid message or reference selection.", error.flatten());
    if (chatSchemaError(error)) return json({ error: "CHAT_SCHEMA_NOT_READY", message: "Donna chat is not initialized in Supabase yet. Apply the Donna chat migration, then refresh this page." }, 503);
    return serverError(error);
  }
}
