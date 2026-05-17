import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/server";
import { badRequest, json, serverError, tooManyRequests, unauthorized } from "@/lib/http";
import { createSupabaseServiceClient } from "@/lib/supabase/client";
import { sourceTypes } from "@/lib/types";
import { triggerConversationProcessing } from "@/lib/processing/trigger";
import { buildSessionAudioStoragePath, prepareUploadedAudio } from "@/lib/intelligence/ingestion/engine";
import {
  BETA_GLOBAL_LIMIT_MESSAGE,
  BETA_GLOBAL_UPLOADS_PER_DAY,
  BETA_MAX_AUDIO_SECONDS,
  BETA_SUPPORT_URL,
  BETA_UPLOAD_LIMIT_MESSAGE,
  BETA_UPLOADS_PER_USER_PER_DAY,
  getDailyUploadUsage
} from "@/lib/beta-limits";

const uploadFieldsSchema = z.object({
  title: z.string().min(1).max(140).optional(),
  source_type: z.enum(sourceTypes).optional(),
  duration_seconds: z.coerce.number().min(0).max(BETA_MAX_AUDIO_SECONDS).optional()
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const formData = await request.formData();
    const audio = formData.get("audio");

    if (!(audio instanceof File)) {
      return badRequest("Expected multipart file field named audio.");
    }
    const fields = uploadFieldsSchema.parse({
      title: formData.get("title") || undefined,
      source_type: formData.get("source_type") || undefined,
      duration_seconds: formData.get("duration_seconds") || undefined
    });
    if (fields.duration_seconds === undefined) {
      return badRequest("Audio duration could not be verified. Please upload audio that is 2 minutes or less.");
    }
    const supabase = createSupabaseServiceClient();
    const usage = await getDailyUploadUsage({ supabase, userId: user.id });

    if (usage.userUploads >= BETA_UPLOADS_PER_USER_PER_DAY) {
      return tooManyRequests("UPLOAD_LIMIT_REACHED", BETA_UPLOAD_LIMIT_MESSAGE, {
        limit: BETA_UPLOADS_PER_USER_PER_DAY,
        used: usage.userUploads,
        reset_timezone: "Asia/Kolkata",
        support_url: BETA_SUPPORT_URL
      });
    }

    if (BETA_GLOBAL_UPLOADS_PER_DAY !== null && usage.globalUploads >= BETA_GLOBAL_UPLOADS_PER_DAY) {
      return tooManyRequests("GLOBAL_DEMO_QUOTA_REACHED", BETA_GLOBAL_LIMIT_MESSAGE, {
        limit: BETA_GLOBAL_UPLOADS_PER_DAY,
        used: usage.globalUploads,
        reset_timezone: "Asia/Kolkata"
      });
    }

    const preparedAudio = await prepareUploadedAudio(audio, fields);
    const sessionId = crypto.randomUUID();
    const storagePath = buildSessionAudioStoragePath(user.id, sessionId, preparedAudio.extension);
    const normalizedAudio = new Blob([preparedAudio.bytes], { type: preparedAudio.contentType });

    const { error: uploadError } = await supabase.storage.from("session-audio").upload(storagePath, normalizedAudio, {
      contentType: preparedAudio.contentType,
      upsert: false
    });
    if (uploadError) {
      throw uploadError;
    }

    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .insert({
        id: sessionId,
        user_id: user.id,
        title: preparedAudio.title,
        source_type: preparedAudio.sourceType,
        audio_storage_path: storagePath,
        status: "uploaded"
      })
      .select("id,status")
      .single();
    if (sessionError) {
      throw sessionError;
    }

    const { data: job, error: jobError } = await supabase
      .from("processing_jobs")
      .insert({
        user_id: user.id,
        session_id: sessionId,
        status: "queued",
        current_step: "queued"
      })
      .select("id")
      .single();
    if (jobError) {
      throw jobError;
    }

    const triggerRun = await triggerConversationProcessing({ session_id: sessionId, user_id: user.id });
    await supabase
      .from("processing_jobs")
      .update({ trigger_run_id: triggerRun.id, updated_at: new Date().toISOString() })
      .eq("id", job.id)
      .eq("user_id", user.id);
    await supabase
      .from("sessions")
      .update({ status: "queued", updated_at: new Date().toISOString() })
      .eq("id", sessionId)
      .eq("user_id", user.id);

    return json({ session_id: session.id, status: "queued" });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    if (error instanceof z.ZodError) {
      return badRequest("Invalid upload fields.", error.flatten());
    }
    if (error instanceof Error && (error.message.startsWith("Unsupported audio type") || error.message.includes("15MB or smaller"))) {
      return badRequest(error.message);
    }
    return serverError(error);
  }
}
