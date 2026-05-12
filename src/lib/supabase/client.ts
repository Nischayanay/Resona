import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export function createSupabaseServiceClient() {
  return createClient(env.supabaseUrl(), env.supabaseServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export function createSupabaseServerClient(accessToken?: string) {
  return createClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      : undefined
  });
}
