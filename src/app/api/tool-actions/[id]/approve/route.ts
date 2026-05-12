import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { badRequest, json, notFound, serverError, unauthorized } from "@/lib/http";
import { createSupabaseServiceClient } from "@/lib/supabase/client";
import { executeGoogleCalendarToolAction } from "@/lib/tool-actions/execute";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;
    const supabase = createSupabaseServiceClient();
    const { data: action, error } = await supabase.from("tool_actions").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();

    if (error) {
      throw error;
    }
    if (!action) {
      return notFound("Tool action");
    }
    if (action.status !== "suggested") {
      return badRequest(`Tool action cannot be approved from status ${action.status}.`);
    }

    await supabase.from("tool_actions").update({ status: "approved", updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id);

    if (action.tool_name === "google_calendar") {
      const result = await executeGoogleCalendarToolAction({ supabase, userId: user.id, action: { ...action, status: "approved" } });
      if ("error" in result) {
        await supabase.from("tool_actions").update({ status: "suggested", updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id);
        return json(result, 409);
      }
      return json({ status: "executed", ...result });
    }

    return badRequest(`Unsupported tool action: ${action.tool_name}.${action.action_type}`);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return serverError(error);
  }
}
