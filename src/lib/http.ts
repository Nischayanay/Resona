import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function badRequest(message: string, details?: unknown) {
  return json({ error: "BAD_REQUEST", message, details }, 400);
}

export function unauthorized() {
  return json({ error: "UNAUTHORIZED", message: "Authentication is required." }, 401);
}

export function forbidden() {
  return json({ error: "FORBIDDEN", message: "You do not have access to this resource." }, 403);
}

export function notFound(resource = "Resource") {
  return json({ error: "NOT_FOUND", message: `${resource} not found.` }, 404);
}

export function serverError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected server error.";
  return json({ error: "SERVER_ERROR", message }, 500);
}

export function zodError(error: ZodError) {
  return badRequest("Validation failed.", error.flatten());
}
