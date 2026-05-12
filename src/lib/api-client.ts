"use client";

import type { Session } from "@supabase/supabase-js";

export async function apiFetch<T>(session: Session, input: RequestInfo | URL, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${session.access_token}`);

  const response = await fetch(input, {
    ...init,
    headers
  });

  const contentType = response.headers.get("content-type");
  const payload = contentType?.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const error = typeof payload === "object" && payload && "message" in payload ? String(payload.message) : `Request failed with ${response.status}`;
    const code = typeof payload === "object" && payload && "error" in payload ? String(payload.error) : "REQUEST_FAILED";
    const detail = new Error(error) as Error & { code?: string; payload?: unknown };
    detail.code = code;
    detail.payload = payload;
    throw detail;
  }

  return payload as T;
}
