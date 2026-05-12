import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { json, serverError, unauthorized } from "@/lib/http";
import { createSupabaseServiceClient } from "@/lib/supabase/client";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("sessions")
      .select("id,title,source_type,status,summary,started_at,created_at,updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return json({ sessions: data });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return serverError(error);
  }
}
