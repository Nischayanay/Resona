import type { SupabaseClient } from "@supabase/supabase-js";
import { createGoogleCalendarEvent, getUsableAccessToken, type CalendarConnection, type CalendarEventPayload } from "@/lib/calendar/google";

type ToolActionRow = {
  id: string;
  user_id: string;
  session_id: string;
  action_item_id: string | null;
  tool_name: string;
  action_type: string;
  payload_json: CalendarEventPayload;
  status: string;
};

export async function executeGoogleCalendarToolAction(params: {
  supabase: SupabaseClient;
  userId: string;
  action: ToolActionRow;
}) {
  const { supabase, userId, action } = params;
  if (action.tool_name !== "google_calendar" || action.action_type !== "create_event") {
    throw new Error(`Unsupported tool action: ${action.tool_name}.${action.action_type}`);
  }

  const { data: connection, error: connectionError } = await supabase
    .from("calendar_connections")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (connectionError) {
    throw connectionError;
  }
  if (!connection) {
    return {
      error: "GOOGLE_CALENDAR_NOT_CONNECTED",
      connect_url: "/api/integrations/google-calendar/connect"
    };
  }

  await supabase.from("tool_actions").update({ status: "executing", updated_at: new Date().toISOString() }).eq("id", action.id).eq("user_id", userId);

  const usable = await getUsableAccessToken(connection as CalendarConnection);
  if (usable.refreshed) {
    await supabase.from("calendar_connections").update({ ...usable.refreshed, updated_at: new Date().toISOString() }).eq("id", (connection as CalendarConnection).id);
  }

  const event = await createGoogleCalendarEvent(usable.accessToken, action.payload_json);
  await supabase.from("calendar_events").insert({
    user_id: userId,
    tool_action_id: action.id,
    google_event_id: event.googleEventId,
    calendar_id: event.calendarId,
    title: event.title,
    starts_at: event.startsAt,
    ends_at: event.endsAt,
    status: event.status
  });

  await supabase
    .from("tool_actions")
    .update({
      status: "executed",
      executed_result_json: event,
      executed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", action.id)
    .eq("user_id", userId);

  if (action.action_item_id) {
    await supabase.from("action_items").update({ status: "scheduled", updated_at: new Date().toISOString() }).eq("id", action.action_item_id).eq("user_id", userId);
  }

  return { event };
}
