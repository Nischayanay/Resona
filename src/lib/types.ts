export const sessionStatuses = [
  "uploaded",
  "queued",
  "transcribing",
  "extracting",
  "normalizing",
  "prioritizing",
  "linking_memory",
  "suggesting_tools",
  "completed",
  "failed",
  "partial_failed"
] as const;

export const sourceTypes = ["meeting", "event", "lecture", "casual", "mentorship", "other"] as const;

export type SessionStatus = (typeof sessionStatuses)[number];
export type SourceType = (typeof sourceTypes)[number];

export type ProcessingPayload = {
  session_id: string;
  user_id: string;
};
