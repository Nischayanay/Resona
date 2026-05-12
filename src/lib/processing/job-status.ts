import type { SupabaseClient } from "@supabase/supabase-js";
import type { SessionStatus } from "@/lib/types";

export async function setProcessingStep(params: {
  supabase: SupabaseClient;
  userId: string;
  sessionId: string;
  status: SessionStatus;
  currentStep: string;
  errorMessage?: string;
}) {
  const { supabase, userId, sessionId, status, currentStep, errorMessage } = params;
  const now = new Date().toISOString();

  await supabase
    .from("sessions")
    .update({
      status,
      updated_at: now
    })
    .eq("id", sessionId)
    .eq("user_id", userId);

  await supabase
    .from("processing_jobs")
    .update({
      status,
      current_step: currentStep,
      error_message: errorMessage ?? null,
      started_at: status === "transcribing" ? now : undefined,
      completed_at: status === "completed" || status === "failed" || status === "partial_failed" ? now : undefined,
      updated_at: now
    })
    .eq("session_id", sessionId)
    .eq("user_id", userId);
}
