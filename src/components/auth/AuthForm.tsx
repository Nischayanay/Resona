"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
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
    <main className="auth-page">
      <div className="auth-card">
        <div className="brand-lockup" aria-label="Resona">
          <div className="brand-mark" aria-hidden="true">
            R
          </div>
          <span>Resona</span>
        </div>

        <section className="auth-panel" aria-labelledby="auth-title">
          <h1 id="auth-title" className="auth-heading">
            {isSignUp ? "Create your account" : "Welcome back"}
          </h1>
          <p className="auth-copy">
            {isSignUp ? "Turn conversations into memory, actions, and follow-ups." : "Open your conversation memory workspace."}
          </p>

          <form className="form-stack" onSubmit={onSubmit}>
            <label className="field">
              <span className="label">Email</span>
              <input
                className="input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label className="field">
              <span className="label">Password</span>
              <input
                className="input"
                type="password"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            {error ? (
              <div className="notice notice-error" role="alert">
                {error}
              </div>
            ) : null}

            {message ? (
              <div className="notice" role="status" aria-live="polite">
                {message}
              </div>
            ) : null}

            <button className="button button-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Working..." : isSignUp ? "Create account" : "Sign in"}
            </button>
          </form>
        </section>

        <p className="form-footer">
          {isSignUp ? "Already have an account?" : "New to Resona?"}{" "}
          <Link className="text-link" href={isSignUp ? "/sign-in" : "/sign-up"}>
            {isSignUp ? "Sign in" : "Create account"}
          </Link>
        </p>

        <p className="legal-links" aria-label="Legal links">
          <Link className="text-link" href="/privacy">
            Privacy
          </Link>
          <Link className="text-link" href="/terms">
            Terms
          </Link>
        </p>
      </div>
    </main>
  );
}
