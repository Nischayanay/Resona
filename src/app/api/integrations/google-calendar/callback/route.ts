import { NextRequest } from "next/server";
import { exchangeGoogleCode, getGoogleUserInfo, encryptedTokenPayload } from "@/lib/calendar/google";
import { decryptText } from "@/lib/crypto/encryption";
import { env } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/client";
import { badRequest, serverError } from "@/lib/http";

type OAuthState = {
  user_id: string;
  nonce: string;
  expires_at: number;
};

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const oauthError = url.searchParams.get("error");

    if (oauthError) {
      return badRequest(`Google OAuth failed: ${oauthError}`);
    }
    if (!code || !state) {
      return badRequest("Missing Google OAuth code or state.");
    }

    const parsedState = JSON.parse(decryptText(state)) as OAuthState;
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

    return Response.redirect(`${env.appUrl()}/integrations/google-calendar/connected`, 302);
  } catch (error) {
    return serverError(error);
  }
}
