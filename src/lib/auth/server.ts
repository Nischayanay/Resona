import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/client";

export type AuthenticatedUser = {
  id: string;
  email?: string;
};

export function getBearerToken(request: NextRequest) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  return header.slice("Bearer ".length);
}

export async function getCurrentUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  const token = getBearerToken(request);
  if (!token) {
    return null;
  }

  const supabase = createSupabaseServerClient(token);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return null;
  }

  return {
    id: data.user.id,
    email: data.user.email ?? undefined
  };
}

export async function requireUser(request: NextRequest): Promise<AuthenticatedUser> {
  const user = await getCurrentUser(request);
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}
