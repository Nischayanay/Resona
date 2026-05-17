import type { SupabaseClient } from "@supabase/supabase-js";
import type { SessionStatus } from "@/lib/types";

export const BETA_UPLOADS_PER_USER_PER_DAY = 2;
export const BETA_MAX_AUDIO_SECONDS = 120;
export const BETA_MAX_AUDIO_BYTES = 15 * 1024 * 1024;
export const BETA_REPROCESSES_PER_SESSION_PER_DAY = 1;
export const BETA_GLOBAL_UPLOADS_PER_DAY: number | null = null;
export const BETA_SUPPORT_URL = "https://x.com/anaybauskar";

export const BETA_UPLOAD_LIMIT_MESSAGE = "Daily upload limit reached. We are running on funds. Help us continue at x.com/anaybauskar.";
export const BETA_GLOBAL_LIMIT_MESSAGE = "Demo quota reached for today. Please try tomorrow.";
export const BETA_FILE_SIZE_MESSAGE = "File must be 15MB or smaller.";
export const BETA_REPROCESS_LIMIT_MESSAGE = "Reprocess limit reached for this session today.";
export const BETA_ACTIVE_REPROCESS_MESSAGE = "This session is already processing. Please wait before reprocessing.";

export const activeProcessingStatuses = new Set<SessionStatus>(["uploaded", "queued", "transcribing", "extracting", "prioritizing", "normalizing", "linking_memory", "suggesting_tools"]);

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function startOfTodayInIndia(now = new Date()) {
  const shifted = new Date(now.getTime() + IST_OFFSET_MS);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - IST_OFFSET_MS).toISOString();
}

export function isAudioWithinBetaSize(size: number) {
  return size <= BETA_MAX_AUDIO_BYTES;
}

export function isActiveProcessingStatus(status: string) {
  return activeProcessingStatuses.has(status as SessionStatus);
}

export async function getDailyUploadUsage(params: { supabase: SupabaseClient; userId: string; now?: Date }) {
  const { supabase, userId, now } = params;
  const dayStart = startOfTodayInIndia(now);
  const [userUploads, globalUploads] = await Promise.all([
    supabase.from("sessions").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", dayStart),
    BETA_GLOBAL_UPLOADS_PER_DAY === null ? Promise.resolve({ count: 0, error: null }) : supabase.from("sessions").select("id", { count: "exact", head: true }).gte("created_at", dayStart)
  ]);

  if (userUploads.error) {
    throw userUploads.error;
  }
  if (globalUploads.error) {
    throw globalUploads.error;
  }

  return {
    dayStart,
    userUploads: userUploads.count ?? 0,
    globalUploads: globalUploads.count ?? 0
  };
}

export async function getDailyReprocessJobCount(params: { supabase: SupabaseClient; userId: string; sessionId: string; now?: Date }) {
  const { supabase, userId, sessionId, now } = params;
  const dayStart = startOfTodayInIndia(now);
  const { count, error } = await supabase
    .from("processing_jobs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .gte("created_at", dayStart);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export function countReprocessAttemptsToday(params: { jobsToday: number; sessionCreatedAt: string; dayStart: string }) {
  const initialUploadJobCount = new Date(params.sessionCreatedAt).getTime() >= new Date(params.dayStart).getTime() ? 1 : 0;
  return Math.max(0, params.jobsToday - initialUploadJobCount);
}
