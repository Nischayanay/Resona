import { NextRequest } from "next/server";
import { exchangeGoogleCode, getGoogleUserInfo, encryptedTokenPayload } from "@/lib/calendar/google";
import { decryptText } from "@/lib/crypto/encryption";
import { env } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/client";
import { badRequest, serverError } from "@/lib/http";
import { appendStatusToReturnPath, normalizeReturnPath } from "@/lib/calendar/connect-flow";

type OAuthState = {
  user_id: string;
  nonce: string;
  expires_at: number;
  return_to: string;
};

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const oauthError = url.searchParams.get("error");
    const fallbackReturnPath = normalizeReturnPath(url.searchParams.get("return_to"));

    if (oauthError) {
      return Response.redirect(`${env.appUrl()}${appendStatusToReturnPath(fallbackReturnPath, "oauth_denied")}`, 302);
    }
    if (!code || !state) {
      return badRequest("Missing Google OAuth code or state.");
    }

    const parsedState = JSON.parse(decryptText(state)) as OAuthState;
    const returnTo = normalizeReturnPath(parsedState.return_to);
    if (!parsedState.user_id || !parsedState.nonce || parsedState.expires_at < Date.now()) {
      return badRequest("Google OAuth state is invalid or expired.");
    }

    const tokens = await exchangeGoogleCode(code);
    const googleUser = await getGoogleUserInfo(tokens.access_token);
    const encryptedTokens = encryptedTokenPayload(tokens);
    const supabase = createSupabaseServiceClient();

    const { error } = await supabase.from("calendar_connections").upsert(
      {
        user_id: parsedState.user_id,
        google_account_email: googleUser.email,
        ...encryptedTokens,
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id,google_account_email" }
    );
    if (error) {
      throw error;
    }

    return Response.redirect(`${env.appUrl()}${appendStatusToReturnPath(returnTo, "connected")}`, 302);
  } catch (error) {
    return serverError(error);
  }
}
