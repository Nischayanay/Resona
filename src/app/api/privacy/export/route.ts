import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { serverError, unauthorized } from "@/lib/http";
import { buildMemoryArchive } from "@/lib/privacy/memory-archive";
import { createSupabaseServiceClient } from "@/lib/supabase/client";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const supabase = createSupabaseServiceClient();
    const archive = await buildMemoryArchive(supabase, user);
    const exportedAt = archive.exported_at.replaceAll(":", "-");

    return new NextResponse(JSON.stringify(archive, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="resona-memory-archive-${exportedAt}.json"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return serverError(error);
  }
}
