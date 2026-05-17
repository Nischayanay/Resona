import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { json, notFound, serverError, tooManyRequests, unauthorized } from "@/lib/http";
import { triggerConversationProcessing } from "@/lib/processing/trigger";
import { createSupabaseServiceClient } from "@/lib/supabase/client";
import {
  BETA_ACTIVE_REPROCESS_MESSAGE,
  BETA_REPROCESSES_PER_SESSION_PER_DAY,
  BETA_REPROCESS_LIMIT_MESSAGE,
  countReprocessAttemptsToday,
  getDailyReprocessJobCount,
  isActiveProcessingStatus,
  startOfTodayInIndia
} from "@/lib/beta-limits";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;
    const supabase = createSupabaseServiceClient();

    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id,status,created_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (sessionError) {
      throw sessionError;
    }
    if (!session) {
      return notFound("Session");
    }
    if (isActiveProcessingStatus(session.status)) {
      return tooManyRequests("SESSION_ALREADY_PROCESSING", BETA_ACTIVE_REPROCESS_MESSAGE);
    }

    const dayStart = startOfTodayInIndia();
    const reprocessJobsToday = await getDailyReprocessJobCount({ supabase, userId: user.id, sessionId: id });
    const reprocessAttemptsToday = countReprocessAttemptsToday({ jobsToday: reprocessJobsToday, sessionCreatedAt: session.created_at, dayStart });
    if (reprocessAttemptsToday >= BETA_REPROCESSES_PER_SESSION_PER_DAY) {
      return tooManyRequests("REPROCESS_LIMIT_REACHED", BETA_REPROCESS_LIMIT_MESSAGE, {
        limit: BETA_REPROCESSES_PER_SESSION_PER_DAY,
        reset_timezone: "Asia/Kolkata"
      });
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
