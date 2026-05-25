"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { House, LogOut, MessagesSquare, Settings, UserCircle } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AppShell({ children }: { children: (session: Session) => ReactNode }) {
  const router = useRouter();
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

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

  useEffect(() => {
    function updateScrollState() {
      const scrollTop = window.scrollY;
      const scrollable =
        document.documentElement.scrollHeight - document.documentElement.clientHeight;

      setHasScrolled(scrollTop > 42);
      setScrollProgress(scrollable > 0 ? Math.min(scrollTop / scrollable, 1) : 0);
    }

    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      window.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, []);

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
          Opening Vynora...
        </div>
      </main>
    );
  }

  return (
    <div className="app-shell app-shell-clarity">
      <div
        className="app-scroll-progress"
        style={{ transform: `scaleX(${scrollProgress})` }}
        aria-hidden="true"
      />
      <header className="home-topbar" data-scrolled={hasScrolled}>
        <Link className="home-brand" href="/home" aria-label="Vynora home">
          <img className="home-brand-mark" src="/resona-memory-orbit.svg" alt="" />
          <span className="home-brand-label">Vynora</span>
        </Link>
        <nav className="home-nav-center" aria-label="Primary app navigation">
          <Link href="/home">
            <House size={16} strokeWidth={1.9} aria-hidden="true" />
            <span className="home-nav-label">Home</span>
          </Link>
          <Link href="/conversations">
            <MessagesSquare size={16} strokeWidth={1.9} aria-hidden="true" />
            <span className="home-nav-label">Conversations</span>
          </Link>
        </nav>
        <div className="home-nav-right">
          <span className="home-profile">
            <UserCircle size={16} strokeWidth={1.9} aria-hidden="true" />
            <span className="home-profile-label">{session.user.email}</span>
          </span>
          <nav className="home-settings-nav" aria-label="Account navigation">
            <Link href="/settings">
              <Settings size={15} strokeWidth={1.9} aria-hidden="true" />
              <span className="home-nav-label">Settings</span>
            </Link>
          </nav>
          <button className="home-sign-out" type="button" onClick={signOut}>
            <LogOut size={16} strokeWidth={1.9} aria-hidden="true" />
            <span className="home-nav-label">Sign out</span>
          </button>
        </div>
      </header>
      {children(session)}
    </div>
  );
}
