import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/server";
import { badRequest, json, serverError, unauthorized } from "@/lib/http";
import { createSupabaseServiceClient } from "@/lib/supabase/client";
import { sourceTypes } from "@/lib/types";
import { triggerConversationProcessing } from "@/lib/processing/trigger";

const MAX_AUDIO_BYTES = 100 * 1024 * 1024;
const allowedAudioTypes = new Set(["audio/mpeg", "audio/mp3", "audio/mp4", "audio/wav", "audio/x-wav", "audio/webm", "audio/ogg", "audio/m4a"]);

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
    if (!allowedAudioTypes.has(audio.type)) {
      return badRequest(`Unsupported audio type: ${audio.type || "unknown"}.`);
    }
    if (audio.size > MAX_AUDIO_BYTES) {
      return badRequest("Audio file is larger than 100MB.");
    }

    const fields = uploadFieldsSchema.parse({
      title: formData.get("title") || undefined,
      source_type: formData.get("source_type") || undefined
    });

    const supabase = createSupabaseServiceClient();
    const extension = audio.name.split(".").pop() || "audio";
    const sessionId = crypto.randomUUID();
    const storagePath = `${user.id}/${sessionId}/original.${extension}`;

    const { error: uploadError } = await supabase.storage.from("session-audio").upload(storagePath, audio, {
      contentType: audio.type,
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
        title: fields.title ?? audio.name,
        source_type: fields.source_type ?? "other",
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

    return json({ session_id: session.id, status: session.status });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    if (error instanceof z.ZodError) {
      return badRequest("Invalid upload fields.", error.flatten());
    }
    return serverError(error);
  }
}
