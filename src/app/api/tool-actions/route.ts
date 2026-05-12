import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { json, serverError, unauthorized } from "@/lib/http";
import { createSupabaseServiceClient } from "@/lib/supabase/client";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const status = new URL(request.url).searchParams.get("status");
    const supabase = createSupabaseServiceClient();
    let query = supabase.from("tool_actions").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (status) {
      query = query.eq("status", status);
    }
    const { data, error } = await query;
    if (error) {
      throw error;
    }
    return json({ tool_actions: data ?? [] });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return serverError(error);
  }
}
