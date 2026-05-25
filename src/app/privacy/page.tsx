import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | Vynora",
  description: "How Vynora collects, uses, stores, and protects user data."
};

const lastUpdated = "May 13, 2026";

export default function PrivacyPolicyPage() {
  return (
    <main className="legal-page">
      <article className="legal-document">
        <header className="legal-header">
          <Link className="brand-lockup legal-brand" href="/sign-in" aria-label="Vynora sign in">
            <div className="brand-mark" aria-hidden="true">
              V
            </div>
            <span>Vynora</span>
          </Link>
          <p className="legal-kicker">Last updated: {lastUpdated}</p>
          <h1>Privacy Policy</h1>
          <p>
            Vynora helps users turn conversations into transcripts, memories, follow-ups, and user-approved calendar actions. This policy explains what
            information we collect, how we use it, and how we handle Google user data.
          </p>
        </header>

        <section>
          <h2>Information we collect</h2>
          <p>We collect information you provide directly and information created while you use Vynora:</p>
          <ul>
            <li>Account information, including your email address and authentication identifiers.</li>
            <li>Conversation content you upload or record, including audio files, titles, source type, transcripts, summaries, and extracted details.</li>
            <li>Generated workspace data, including people, action items, opportunities, memory facts, follow-ups, tool suggestions, and processing status.</li>
            <li>Google Calendar connection data, including the Google account email, OAuth scopes granted, encrypted access tokens, and encrypted refresh tokens.</li>
            <li>Technical information needed to operate the service, such as request metadata, logs, error reports, and security events.</li>
          </ul>
        </section>

        <section>
          <h2>How we use information</h2>
          <p>We use your information to provide and improve the product features you choose to use:</p>
          <ul>
            <li>Authenticate your account and keep your workspace separated from other users.</li>
            <li>Store uploaded audio and conversation records.</li>
            <li>Transcribe audio and extract structured memories, people, action items, opportunities, and follow-ups.</li>
            <li>Suggest calendar actions from conversations and create Google Calendar events only after you approve the action.</li>
            <li>Debug, secure, monitor, and maintain the service.</li>
            <li>Respond to support, deletion, privacy, or security requests.</li>
          </ul>
        </section>

        <section>
          <h2>Google user data</h2>
          <p>
            Vynora requests Google Calendar access only to support the visible calendar feature in the app. The current requested Google OAuth scopes are{" "}
            <code>openid</code>, <code>email</code>, <code>profile</code>, and <code>https://www.googleapis.com/auth/calendar.events</code>.
          </p>
          <p>When you connect Google Calendar, Vynora may use Google user data to:</p>
          <ul>
            <li>Identify the connected Google account email.</li>
            <li>Store encrypted OAuth tokens so the app can create calendar events after user approval.</li>
            <li>Create events on your primary Google Calendar when you approve a suggested calendar action.</li>
          </ul>
          <p>
            Vynora does not read your existing Google Calendar events, does not sell Google user data, does not use Google user data for ads, and does not
            transfer Google user data to third parties except as necessary to provide the user-facing calendar feature, comply with law, or protect the
            service from abuse. Vynora&apos;s use and transfer of information received from Google APIs will adhere to the{" "}
            <a href="https://developers.google.com/terms/api-services-user-data-policy" rel="noreferrer" target="_blank">
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>
        </section>

        <section>
          <h2>AI processing</h2>
          <p>
            Vynora uses Google Gemini to transcribe audio and extract structured information from transcripts. Conversation content may be sent to Google
            AI services for that processing. AI output can be incomplete or inaccurate, so calendar actions and other external effects should be reviewed
            before you approve them.
          </p>
        </section>

        <section>
          <h2>Service providers</h2>
          <p>We use third-party providers to run Vynora. These providers process information only as needed to deliver their services to us:</p>
          <ul>
            <li>Supabase for authentication, database storage, private audio storage, and row-level access controls.</li>
            <li>Google APIs for Gemini AI processing and Google Calendar event creation.</li>
            <li>Trigger.dev for background processing orchestration.</li>
            <li>Vercel for hosting and deployment.</li>
          </ul>
        </section>

        <section>
          <h2>Storage and security</h2>
          <p>
            We use access controls, private storage, encrypted calendar tokens, HTTPS in transit, and per-user database policies to protect user data. No
            online service can guarantee absolute security, but we use reasonable safeguards designed for the sensitivity of conversation and calendar
            data.
          </p>
        </section>

        <section>
          <h2>Retention and deletion</h2>
          <p>
            We retain account data, conversation records, generated memories, uploaded audio, and calendar connection data while your account is active or
            as needed to operate the service. You can ask us to delete your account data or disconnect Google Calendar by contacting us. After Google
            Calendar is disconnected, Vynora will no longer use stored Google OAuth tokens for your account.
          </p>
        </section>

        <section>
          <h2>Your choices</h2>
          <ul>
            <li>You can choose not to connect Google Calendar.</li>
            <li>You can deny a suggested calendar action instead of approving it.</li>
            <li>You can revoke Google access from your Google Account permissions page.</li>
            <li>You can request access, correction, export, or deletion of your Vynora data by contacting us.</li>
          </ul>
        </section>

        <section>
          <h2>Children</h2>
          <p>Vynora is not intended for children under 13, and we do not knowingly collect personal information from children under 13.</p>
        </section>

        <section>
          <h2>Changes</h2>
          <p>
            We may update this policy as Vynora changes. If a change is material, we will update the date above and take reasonable steps to notify users
            through the product or another appropriate channel.
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            For privacy, security, or deletion requests, contact <a href="mailto:anaybauskr@gmail.com">anaybauskr@gmail.com</a>.
          </p>
        </section>
      </article>
    </main>
  );
}
