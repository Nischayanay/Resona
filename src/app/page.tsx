import Link from "next/link";

export default function Home() {
  return (
    <main className="public-home">
      <section className="public-home-inner" aria-labelledby="home-title">
        <nav className="public-nav" aria-label="Main navigation">
          <Link className="brand-lockup" href="/" aria-label="Resona home">
            <div className="brand-mark" aria-hidden="true">
              R
            </div>
            <span>Resona</span>
          </Link>
          <div className="public-nav-links">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/sign-in">Sign in</Link>
          </div>
        </nav>

        <div className="public-hero">
          <p className="legal-kicker">Conversation memory workspace</p>
          <h1 id="home-title">Resona</h1>
          <p>
            Resona helps users turn conversations into transcripts, structured memories, follow-ups, and user-approved Google Calendar actions.
          </p>
          <div className="button-row">
            <Link className="button button-primary" href="/sign-up">
              Create account
            </Link>
            <Link className="button button-secondary" href="/sign-in">
              Sign in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
