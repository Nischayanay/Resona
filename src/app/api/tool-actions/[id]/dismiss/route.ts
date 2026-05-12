import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { badRequest, json, notFound, serverError, unauthorized } from "@/lib/http";
import { createSupabaseServiceClient } from "@/lib/supabase/client";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;
    const supabase = createSupabaseServiceClient();
    const { data: action, error } = await supabase.from("tool_actions").select("id,status").eq("id", id).eq("user_id", user.id).maybeSingle();

    if (error) {
      throw error;
    }
    if (!action) {
      return notFound("Tool action");
    }
    if (!["suggested", "failed"].includes(action.status)) {
      return badRequest(`Tool action cannot be dismissed from status ${action.status}.`);
    }

    const { error: updateError } = await supabase
      .from("tool_actions")
      .update({ status: "dismissed", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);
    if (updateError) {
      throw updateError;
    }

    return json({ id, status: "dismissed" });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return serverError(error);
  }
}
