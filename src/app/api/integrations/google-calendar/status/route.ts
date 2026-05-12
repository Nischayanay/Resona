import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { json, serverError, unauthorized } from "@/lib/http";
import { createSupabaseServiceClient } from "@/lib/supabase/client";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("calendar_connections")
      .select("id,google_account_email,expires_at,scopes,created_at,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      throw error;
    }

    return json({ connected: (data?.length ?? 0) > 0, connections: data ?? [] });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return serverError(error);
  }
}
