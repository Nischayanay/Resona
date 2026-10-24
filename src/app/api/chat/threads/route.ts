import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/server";
import { badRequest, json, serverError, unauthorized } from "@/lib/http";
import { createSupabaseServiceClient } from "@/lib/supabase/client";

const createThreadSchema = z.object({ title: z.string().trim().min(1).max(80).optional() });
const FREE_THREAD_LIMIT = 2;

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase.from("chat_threads").select("id,title,plan,created_at,updated_at").eq("user_id", user.id).order("updated_at", { ascending: false });
    if (error) throw error;
    return json({ threads: data ?? [], limit: FREE_THREAD_LIMIT });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = createThreadSchema.parse(await request.json().catch(() => ({})));
    const supabase = createSupabaseServiceClient();
    const { count, error: countError } = await supabase.from("chat_threads").select("id", { count: "exact", head: true }).eq("user_id", user.id);
    if (countError) throw countError;
    if ((count ?? 0) >= FREE_THREAD_LIMIT) return json({ error: "CHAT_LIMIT_REACHED", message: "Free accounts can keep two chats. Upgrade to create more." }, 429);
    const { data, error } = await supabase.from("chat_threads").insert({ user_id: user.id, title: body.title ?? "New chat" }).select("id,title,plan,created_at,updated_at").single();
    if (error) throw error;
    return json({ thread: data }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorized();
    if (error instanceof z.ZodError) return badRequest("Invalid chat title.", error.flatten());
    return serverError(error);
  }
}
