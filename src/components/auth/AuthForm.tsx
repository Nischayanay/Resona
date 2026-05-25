"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, LockKeyhole, Mail } from "lucide-react";
import { FormEvent, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type AuthMode = "sign-up" | "sign-in";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isSignUp = mode === "sign-up";
  const headline = isSignUp ? "Start with one remembered conversation." : "Return to what matters.";
  const support = isSignUp
    ? "Keep people, promises, dates, and openings connected from the first conversation."
    : "Open the workspace where your people, promises, dates, and openings stay connected.";
  const submitLabel = isSubmitting ? (isSignUp ? "Creating..." : "Opening...") : isSignUp ? "Create account" : "Sign in";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const result = isSignUp
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

      if (result.error) {
        setError(result.error.message);
        return;
      }

      if (isSignUp && !result.data.session) {
        setMessage("Check your email to confirm your account, then sign in.");
        return;
      }

      router.replace("/home");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Authentication is not configured.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="vy-auth-page">
      <section className="vy-auth-shell" aria-labelledby="auth-title">
        <div className="vy-auth-form-column">
          <Link className="vy-auth-brand" href="/" aria-label="Vynora home">
            <img className="vy-auth-brand-mark" src="/resona-memory-orbit.svg" alt="" />
            <span>Vynora</span>
          </Link>

          <div className="vy-auth-heading">
            <Badge>{isSignUp ? "N° 01 / Create memory" : "N° 02 / Continue thread"}</Badge>
            <h1 id="auth-title">
              {headline.replace(/\.$/, "")}
              <em>.</em>
            </h1>
            <p>{support}</p>
          </div>

          <form className="vy-auth-form" onSubmit={onSubmit}>
            <label className="vy-auth-field">
              <span>Email</span>
              <div className="vy-auth-input-wrap">
                <Mail size={17} strokeWidth={1.7} aria-hidden="true" />
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
            </label>

            <label className="vy-auth-field">
              <span>Password</span>
              <div className="vy-auth-input-wrap">
                <LockKeyhole size={17} strokeWidth={1.7} aria-hidden="true" />
                <input
                  type="password"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={isSignUp ? "Create a password" : "Enter your password"}
                  required
                />
              </div>
            </label>

            {error ? (
              <div className="vy-auth-notice vy-auth-notice-error" role="alert">
                {error}
              </div>
            ) : null}

            {message ? (
              <div className="vy-auth-notice vy-auth-notice-success" role="status" aria-live="polite">
                {message}
              </div>
            ) : null}

            <Button className="vy-auth-submit" type="submit" disabled={isSubmitting}>
              {submitLabel}
              <ArrowRight size={17} strokeWidth={1.8} aria-hidden="true" />
            </Button>
          </form>

          <div className="vy-auth-switch">
            <span>{isSignUp ? "Already have a thread?" : "New to Vynora?"}</span>
            <Link href={isSignUp ? "/sign-in" : "/sign-up"}>{isSignUp ? "Sign in" : "Create account"}</Link>
          </div>

          <nav className="vy-auth-legal" aria-label="Legal links">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </nav>
        </div>

        <aside className="vy-auth-art-panel" aria-label="Vynora memory artwork">
          <img src="/brand/vynora-hero-art.png" alt="" />
          <div className="vy-auth-art-grid" aria-hidden="true" />
          <div className="vy-auth-art-caption vy-auth-art-caption-top">FIG. 02 / ACCESS</div>
          <div className="vy-auth-art-caption vy-auth-art-caption-side">PRIVATE PLATE</div>
          <div className="vy-auth-art-ledger" aria-hidden="true">
            <span>01 PERSON</span>
            <span>02 PROMISE</span>
            <span>03 DATE</span>
            <span>04 DECIDE</span>
          </div>
          <div className="vy-auth-art-proof" aria-hidden="true">
            <Check size={14} strokeWidth={1.8} />
            <span>Nothing moves without approval</span>
          </div>
        </aside>
      </section>
    </main>
  );
}
