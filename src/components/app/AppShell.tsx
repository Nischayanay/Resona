"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { LogOut } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AppShell({ children }: { children: (session: Session) => ReactNode }) {
  const router = useRouter();
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let client: SupabaseClient;

    try {
      client = createSupabaseBrowserClient();
      setSupabase(client);
    } catch (error) {
      setConfigError(error instanceof Error ? error.message : "Supabase is not configured.");
      setIsLoading(false);
      return;
    }

    client.auth.getSession().then(({ data }) => {
      if (!mounted) {
        return;
      }
      if (!data.session) {
        router.replace("/sign-up");
        return;
      }
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: authListener } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!nextSession) {
        router.replace("/sign-up");
        return;
      }
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  async function signOut() {
    if (!supabase) {
      return;
    }
    await supabase.auth.signOut();
    router.replace("/sign-in");
  }

  if (configError) {
    return (
      <main className="auth-page">
        <div className="notice notice-error" role="alert">
          {configError}
        </div>
      </main>
    );
  }

  if (isLoading || !session) {
    return (
      <main className="auth-page">
        <div className="notice" role="status">
          Opening Resona...
        </div>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="brand-lockup" aria-label="Resona">
          <div className="brand-mark" aria-hidden="true">
            R
          </div>
          <span>Resona</span>
        </div>
        <div className="button-row" style={{ alignItems: "center" }}>
          <span className="app-user">{session.user.email}</span>
          <button className="button button-secondary" type="button" onClick={signOut}>
            <LogOut size={16} aria-hidden="true" />
            Sign out
          </button>
        </div>
      </header>
      {children(session)}
    </div>
  );
}
