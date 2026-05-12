import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { json, notFound, serverError, unauthorized } from "@/lib/http";
import { triggerConversationProcessing } from "@/lib/processing/trigger";
import { createSupabaseServiceClient } from "@/lib/supabase/client";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;
    const supabase = createSupabaseServiceClient();

    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (sessionError) {
      throw sessionError;
    }
    if (!session) {
      return notFound("Session");
    }

    await supabase.from("sessions").update({ status: "queued", updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id);
    const { data: job, error: jobError } = await supabase
      .from("processing_jobs")
      .insert({
        user_id: user.id,
        session_id: id,
        status: "queued",
        current_step: "queued"
      })
      .select("id")
      .single();
    if (jobError) {
      throw jobError;
    }

    const triggerRun = await triggerConversationProcessing({ session_id: id, user_id: user.id });
    await supabase
      .from("processing_jobs")
      .update({ trigger_run_id: triggerRun.id, updated_at: new Date().toISOString() })
      .eq("id", job.id)
      .eq("user_id", user.id);

    return json({ session_id: id, status: "queued", trigger_run_id: triggerRun.id });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return serverError(error);
  }
}
