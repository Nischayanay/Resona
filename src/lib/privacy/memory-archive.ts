import type { SupabaseClient } from "@supabase/supabase-js";

const userScopedTables = [
  "sessions",
  "transcripts",
  "people",
  "session_people",
  "action_items",
  "opportunities",
  "memory_facts",
  "follow_ups",
  "tool_actions",
  "calendar_events",
  "processing_jobs",
  "ai_extraction_runs",
  "session_insights",
  "priority_signals",
  "person_memory_profiles",
  "memory_edges",
  "long_term_memory_summaries"
] as const;

const deletionOrder = [
  "memory_edges",
  "long_term_memory_summaries",
  "sessions",
  "people"
] as const;

export type MemoryArchive = {
  exported_at: string;
  user: {
    id: string;
    email?: string;
  };
  profile: unknown;
  calendar_connections: unknown[];
  data: Record<(typeof userScopedTables)[number], unknown[]>;
};

async function selectUserRows(supabase: SupabaseClient, table: string, userId: string) {
  const { data, error } = await supabase.from(table).select("*").eq("user_id", userId);
  if (error) {
    throw error;
  }
  return data ?? [];
}

export async function buildMemoryArchive(supabase: SupabaseClient, user: { id: string; email?: string }): Promise<MemoryArchive> {
  const [profileResult, calendarResult, ...tableResults] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("calendar_connections")
      .select("id,user_id,google_account_email,expires_at,scopes,created_at,updated_at")
      .eq("user_id", user.id),
    ...userScopedTables.map((table) => selectUserRows(supabase, table, user.id))
  ]);

  if (profileResult.error) {
    throw profileResult.error;
  }
  if (calendarResult.error) {
    throw calendarResult.error;
  }

  return {
    exported_at: new Date().toISOString(),
    user,
    profile: profileResult.data,
    calendar_connections: calendarResult.data ?? [],
    data: Object.fromEntries(userScopedTables.map((table, index) => [table, tableResults[index]])) as MemoryArchive["data"]
  };
}

export async function deleteStoredMemory(supabase: SupabaseClient, userId: string) {
  const { data: sessions, error: sessionLoadError } = await supabase.from("sessions").select("id,audio_storage_path").eq("user_id", userId);
  if (sessionLoadError) {
    throw sessionLoadError;
  }

  const audioPaths = (sessions ?? []).map((session) => session.audio_storage_path).filter((path): path is string => Boolean(path));
  if (audioPaths.length > 0) {
    const { error: storageError } = await supabase.storage.from("session-audio").remove(audioPaths);
    if (storageError) {
      throw storageError;
    }
  }

  for (const table of deletionOrder) {
    const { error } = await supabase.from(table).delete().eq("user_id", userId);
    if (error) {
      throw error;
    }
  }

  return {
    deleted_sessions: sessions?.length ?? 0,
    deleted_audio_objects: audioPaths.length
  };
}
