import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/server";
import { badRequest, json, serverError, unauthorized } from "@/lib/http";
import { createSupabaseServiceClient } from "@/lib/supabase/client";
import { sourceTypes } from "@/lib/types";
import { triggerConversationProcessing } from "@/lib/processing/trigger";
import { buildSessionAudioStoragePath, prepareUploadedAudio } from "@/lib/intelligence/ingestion/engine";

const uploadFieldsSchema = z.object({
  title: z.string().min(1).max(140).optional(),
  source_type: z.enum(sourceTypes).optional()
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
      source_type: formData.get("source_type") || undefined
    });
    const preparedAudio = await prepareUploadedAudio(audio, fields);

    const supabase = createSupabaseServiceClient();
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
    if (error instanceof Error && (error.message.startsWith("Unsupported audio type") || error.message.includes("larger than 100MB"))) {
      return badRequest(error.message);
    }
    return serverError(error);
  }
}
