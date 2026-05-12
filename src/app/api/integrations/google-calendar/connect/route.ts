import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { encryptText } from "@/lib/crypto/encryption";
import { buildGoogleAuthUrl } from "@/lib/calendar/google";
import { serverError, unauthorized } from "@/lib/http";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const state = encryptText(
      JSON.stringify({
        user_id: user.id,
        nonce: crypto.randomUUID(),
        expires_at: Date.now() + 10 * 60 * 1000
      })
    );
    return Response.redirect(buildGoogleAuthUrl(state), 302);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return serverError(error);
  }
}
