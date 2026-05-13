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

function getOAuthFailureReason(url: URL) {
  const oauthError = (url.searchParams.get("error") ?? "").toLowerCase();
  const description = `${url.searchParams.get("error_description") ?? ""} ${url.searchParams.get("error_subtype") ?? ""}`.toLowerCase();

  if (
    oauthError === "access_denied" &&
    (description.includes("has not completed the google verification process") ||
      description.includes("can only be accessed by developer-approved testers") ||
      description.includes("app is currently being tested"))
  ) {
    return "google_oauth_testing";
  }

  if (oauthError === "access_denied") {
    return "access_denied";
  }

  return "oauth_error";
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const oauthError = url.searchParams.get("error");
    const fallbackReturnPath = normalizeReturnPath(url.searchParams.get("return_to"));

    if (oauthError) {
      const reason = getOAuthFailureReason(url);
      return Response.redirect(`${env.appUrl()}${appendStatusToReturnPath(fallbackReturnPath, "oauth_error", reason)}`, 302);
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
