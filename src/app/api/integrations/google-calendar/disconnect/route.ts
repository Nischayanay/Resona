import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { json, serverError, unauthorized } from "@/lib/http";
import { createSupabaseServiceClient } from "@/lib/supabase/client";

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase.from("calendar_connections").delete().eq("user_id", user.id);
    if (error) {
      throw error;
    }
    return json({ disconnected: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return serverError(error);
  }
}
