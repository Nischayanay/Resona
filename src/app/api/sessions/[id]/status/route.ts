import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { json, notFound, serverError, unauthorized } from "@/lib/http";
import { createSupabaseServiceClient } from "@/lib/supabase/client";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;
    const supabase = createSupabaseServiceClient();

    const { data, error } = await supabase
      .from("sessions")
      .select("id,status,updated_at,processing_jobs(status,current_step,error_message,trigger_run_id,created_at,updated_at)")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!data) {
      return notFound("Session");
    }

    return json(data);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return serverError(error);
  }
}
