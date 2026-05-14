"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { LogOut, Settings, UserCircle } from "lucide-react";
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
    <div className="app-shell app-shell-clarity">
      <header className="home-topbar">
        <Link className="home-brand" href="/home" aria-label="Resona home">
          <div className="home-brand-mark" aria-hidden="true">
            R
          </div>
          <span>Resona</span>
        </Link>
        <nav className="home-nav-center" aria-label="Primary app navigation">
          <Link href="/home">Home</Link>
          <Link href="/conversations">Conversations</Link>
        </nav>
        <div className="home-nav-right">
          <span className="home-profile">
            <UserCircle size={16} aria-hidden="true" />
            <span>{session.user.email}</span>
          </span>
          <nav className="home-settings-nav" aria-label="Account navigation">
            <Link href="/settings">
              <Settings size={15} aria-hidden="true" />
              Settings
            </Link>
          </nav>
          <button className="home-sign-out" type="button" onClick={signOut}>
            <LogOut size={16} aria-hidden="true" />
            Sign out
          </button>
        </div>
      </header>
      {children(session)}
    </div>
  );
}
