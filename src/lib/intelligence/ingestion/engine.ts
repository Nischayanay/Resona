import { normalizeAudioMimeType } from "@/lib/audio/mime";
import { BETA_FILE_SIZE_MESSAGE, BETA_MAX_AUDIO_BYTES } from "@/lib/beta-limits";
import { sourceTypes } from "@/lib/types";

export const MAX_AUDIO_BYTES = BETA_MAX_AUDIO_BYTES;

export type IngestedAudioInput = {
  title: string;
  sourceType: (typeof sourceTypes)[number];
  contentType: string;
  extension: string;
  bytes: ArrayBuffer;
};

export async function prepareUploadedAudio(audio: File, fields: { title?: string; source_type?: (typeof sourceTypes)[number] }): Promise<IngestedAudioInput> {
  const contentType = normalizeAudioMimeType(audio.type, audio.name);
  if (!contentType) {
    throw new Error(`Unsupported audio type: ${audio.type || "unknown"}.`);
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    throw new Error(BETA_FILE_SIZE_MESSAGE);
  }

  return {
    title: fields.title ?? audio.name,
    sourceType: fields.source_type ?? "other",
    contentType,
    extension: audio.name.split(".").pop() || "audio",
    bytes: await audio.arrayBuffer()
  };
}

export function buildSessionAudioStoragePath(userId: string, sessionId: string, extension: string) {
  return `${userId}/${sessionId}/original.${extension}`;
}
