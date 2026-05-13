import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/server";
import { encryptText } from "@/lib/crypto/encryption";
import { buildGoogleAuthUrl } from "@/lib/calendar/google";
import { json, serverError, unauthorized, zodError } from "@/lib/http";
import { normalizeReturnPath } from "@/lib/calendar/connect-flow";

const connectSchema = z.object({
  return_to: z.string().optional()
});

type OAuthState = {
  user_id: string;
  nonce: string;
  expires_at: number;
  return_to: string;
};

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = connectSchema.parse(await request.json().catch(() => ({})));
    const returnTo = normalizeReturnPath(body.return_to);
    const state = encryptText(
      JSON.stringify({
        user_id: user.id,
        nonce: crypto.randomUUID(),
        expires_at: Date.now() + 10 * 60 * 1000,
        return_to: returnTo
      } satisfies OAuthState)
    );
    return json({ auth_url: buildGoogleAuthUrl(state) });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    if (error instanceof z.ZodError) {
      return zodError(error);
    }
    return serverError(error);
  }
}
