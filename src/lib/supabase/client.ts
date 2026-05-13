import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { env } from "@/lib/env";

const realtimeTransport = WebSocket as unknown as typeof globalThis.WebSocket;

export function createSupabaseServiceClient() {
  return createClient(env.supabaseUrl(), env.supabaseServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    realtime: {
      transport: realtimeTransport
    }
  });
}

export function createSupabaseServerClient(accessToken?: string) {
  return createClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    realtime: {
      transport: realtimeTransport
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
