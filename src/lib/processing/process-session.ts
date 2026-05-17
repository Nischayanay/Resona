import { createSupabaseServiceClient } from "@/lib/supabase/client";
import { normalizeConversationExtraction } from "@/lib/processing/normalization";
import { setProcessingStep } from "@/lib/processing/job-status";
import type { ProcessingPayload } from "@/lib/types";
import { parseGeminiJson } from "@/lib/ai/gemini";
import { normalizeAudioMimeType } from "@/lib/audio/mime";
import { transcribeConversationAudio } from "@/lib/intelligence/transcription/engine";
import { understandConversation } from "@/lib/intelligence/understanding/engine";
import { buildPrioritySignals, buildSessionInsights, persistPriorityOutputs } from "@/lib/intelligence/priority/engine";
import { updateConversationMemory } from "@/lib/intelligence/memory/engine";
import { suggestApprovedToolActions } from "@/lib/intelligence/actions/engine";

type SessionRow = {
  id: string;
  user_id: string;
  audio_storage_path: string;
};

export async function processConversationSession(payload: ProcessingPayload) {
  const supabase = createSupabaseServiceClient();
  const { session_id: sessionId, user_id: userId } = payload;

  try {
    await setProcessingStep({ supabase, userId, sessionId, status: "transcribing", currentStep: "transcribing" });

    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id,user_id,audio_storage_path")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .single();

    if (sessionError || !session) {
      throw sessionError ?? new Error("Session not found.");
    }

    const typedSession = session as SessionRow;
    const { data: audioBlob, error: audioError } = await supabase.storage.from("session-audio").download(typedSession.audio_storage_path);
    if (audioError || !audioBlob) {
      throw audioError ?? new Error("Audio download failed.");
    }

    const audio = await audioBlob.arrayBuffer();
    const transcriptionMimeType = normalizeAudioMimeType(audioBlob.type, typedSession.audio_storage_path) ?? "audio/mpeg";
    const transcription = await transcribeConversationAudio(audio, transcriptionMimeType);

    const { error: transcriptError } = await supabase.from("transcripts").insert({
      user_id: userId,
      session_id: sessionId,
      raw_text: transcription.rawText,
      cleaned_text: transcription.cleanedText,
      segments_json: transcription.segments,
      confidence: transcription.confidence,
      language: transcription.language,
      model_used: transcription.model,
      provider: transcription.provider
    });
    if (transcriptError) {
      throw transcriptError;
    }

    await setProcessingStep({ supabase, userId, sessionId, status: "extracting", currentStep: "extracting" });

    let understandingResult: Awaited<ReturnType<typeof understandConversation>>;
    try {
      understandingResult = await understandConversation(transcription.cleanedText);
      await supabase.from("ai_extraction_runs").insert({
        user_id: userId,
        session_id: sessionId,
        provider: understandingResult.provider,
        model: understandingResult.model,
        prompt_version: understandingResult.promptVersion,
        raw_output_json: parseGeminiJson(understandingResult.raw),
        validated_output_json: understandingResult.extraction,
        status: "validated"
      });
    } catch (error) {
      await supabase.from("ai_extraction_runs").insert({
        user_id: userId,
        session_id: sessionId,
        provider: "google",
        model: "gemini-1.5-flash",
        prompt_version: "resona-extraction-v1",
        raw_output_json: { error: error instanceof Error ? error.message : String(error) },
        status: "failed",
        error_message: error instanceof Error ? error.message : String(error)
      });
      await setProcessingStep({
        supabase,
        userId,
        sessionId,
        status: "partial_failed",
        currentStep: "extracting",
        errorMessage: error instanceof Error ? error.message : String(error)
      });
      return;
    }

    const extraction = understandingResult.extraction;

    await setProcessingStep({ supabase, userId, sessionId, status: "prioritizing", currentStep: "prioritizing" });
    const prioritySignals = buildPrioritySignals(extraction);
    const sessionInsights = buildSessionInsights(extraction, prioritySignals);
    await persistPriorityOutputs({
      supabase,
      userId,
      sessionId,
      signals: prioritySignals,
      insights: sessionInsights
    });

    await setProcessingStep({ supabase, userId, sessionId, status: "normalizing", currentStep: "normalizing" });
    const normalized = await normalizeConversationExtraction({
      supabase,
      userId,
      sessionId,
      extraction
    });

    await setProcessingStep({ supabase, userId, sessionId, status: "linking_memory", currentStep: "linking_memory" });
    await updateConversationMemory({
      supabase,
      userId,
      sessionId,
      extraction,
      context: normalized
    });

    await setProcessingStep({ supabase, userId, sessionId, status: "suggesting_tools", currentStep: "suggesting_tools" });
    await suggestApprovedToolActions({
      supabase,
      userId,
      sessionId,
      suggestions: extraction.tool_suggestions,
      actionRows: normalized.actionRows
    });
    await setProcessingStep({ supabase, userId, sessionId, status: "completed", currentStep: "completed" });
  } catch (error) {
    await setProcessingStep({
      supabase,
      userId,
      sessionId,
      status: "failed",
      currentStep: "failed",
      errorMessage: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}
