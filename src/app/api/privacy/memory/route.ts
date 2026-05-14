import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { json, serverError, unauthorized } from "@/lib/http";
import { deleteStoredMemory } from "@/lib/privacy/memory-archive";
import { createSupabaseServiceClient } from "@/lib/supabase/client";

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const supabase = createSupabaseServiceClient();
    const result = await deleteStoredMemory(supabase, user.id);

    return json({
      deleted: true,
      ...result
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return serverError(error);
  }
}
