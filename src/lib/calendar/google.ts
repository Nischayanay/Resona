import { env } from "@/lib/env";
import { decryptText, encryptText } from "@/lib/crypto/encryption";

export const GOOGLE_CALENDAR_SCOPES = ["openid", "email", "profile", "https://www.googleapis.com/auth/calendar.events"];

export type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type: string;
  id_token?: string;
};

export type CalendarConnection = {
  id: string;
  user_id: string;
  google_account_email: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  expires_at: string;
  scopes: string[];
};

export type CalendarEventPayload = {
  title: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  attendees?: { name?: string; email?: string }[];
};

export function buildGoogleAuthUrl(state: string) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", env.googleClientId());
  url.searchParams.set("redirect_uri", env.googleRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("scope", GOOGLE_CALENDAR_SCOPES.join(" "));
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeGoogleCode(code: string): Promise<GoogleTokenResponse> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.googleClientId(),
      client_secret: env.googleClientSecret(),
      redirect_uri: env.googleRedirectUri(),
      grant_type: "authorization_code"
    })
  });

  if (!response.ok) {
    throw new Error(`Google token exchange failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: env.googleClientId(),
      client_secret: env.googleClientSecret(),
      grant_type: "refresh_token"
    })
  });

  if (!response.ok) {
    throw new Error(`Google token refresh failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

export async function getGoogleUserInfo(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) {
    throw new Error(`Google userinfo failed: ${response.status} ${await response.text()}`);
  }
  return response.json() as Promise<{ email: string }>;
}

export function encryptedTokenPayload(tokens: GoogleTokenResponse, fallbackRefreshToken?: string) {
  const refreshToken = tokens.refresh_token ?? fallbackRefreshToken;
  if (!refreshToken) {
    throw new Error("Google did not return a refresh token.");
  }
  return {
    access_token_encrypted: encryptText(tokens.access_token),
    refresh_token_encrypted: encryptText(refreshToken),
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    scopes: tokens.scope?.split(" ") ?? GOOGLE_CALENDAR_SCOPES
  };
}

export async function getUsableAccessToken(connection: CalendarConnection) {
  if (new Date(connection.expires_at).getTime() > Date.now() + 60_000) {
    return {
      accessToken: decryptText(connection.access_token_encrypted),
      refreshed: null as null | ReturnType<typeof encryptedTokenPayload>
    };
  }

  const refreshToken = decryptText(connection.refresh_token_encrypted);
  const refreshedTokens = await refreshGoogleAccessToken(refreshToken);
  return {
    accessToken: refreshedTokens.access_token,
    refreshed: encryptedTokenPayload(refreshedTokens, refreshToken)
  };
}

export async function createGoogleCalendarEvent(accessToken: string, payload: CalendarEventPayload) {
  if (!payload.start_time) {
    throw new Error("Calendar event requires start_time.");
  }

  const startsAt = new Date(payload.start_time);
  if (Number.isNaN(startsAt.getTime())) {
    throw new Error("Calendar event start_time is invalid.");
  }

  const endsAt = payload.end_time ? new Date(payload.end_time) : new Date(startsAt.getTime() + 30 * 60 * 1000);
  if (Number.isNaN(endsAt.getTime())) {
    throw new Error("Calendar event end_time is invalid.");
  }

  const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      summary: payload.title,
      description: payload.description,
      start: { dateTime: startsAt.toISOString() },
      end: { dateTime: endsAt.toISOString() },
      attendees: payload.attendees?.filter((attendee) => attendee.email).map((attendee) => ({ email: attendee.email }))
    })
  });

  if (!response.ok) {
    throw new Error(`Google Calendar event creation failed: ${response.status} ${await response.text()}`);
  }

  const event = (await response.json()) as { id: string; status: string; summary: string };
  return {
    googleEventId: event.id,
    calendarId: "primary",
    title: event.summary ?? payload.title,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    status: event.status
  };
}
