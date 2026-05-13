import Link from "next/link";

export const metadata = {
  title: "Terms of Service | Resona",
  description: "Terms for using Resona."
};

const lastUpdated = "May 13, 2026";

export default function TermsPage() {
  return (
    <main className="legal-page">
      <article className="legal-document">
        <header className="legal-header">
          <Link className="brand-lockup legal-brand" href="/sign-in" aria-label="Resona sign in">
            <div className="brand-mark" aria-hidden="true">
              R
            </div>
            <span>Resona</span>
          </Link>
          <p className="legal-kicker">Last updated: {lastUpdated}</p>
          <h1>Terms of Service</h1>
          <p>
            These Terms govern your access to and use of Resona. By using Resona, you agree to these Terms and to the{" "}
            <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </header>

        <section>
          <h2>Service description</h2>
          <p>
            Resona is a conversation memory workspace. It lets users upload or record conversations, generate transcripts and structured notes, extract
            people and action items, and approve suggested Google Calendar event creation.
          </p>
        </section>

        <section>
          <h2>Accounts</h2>
          <p>
            You are responsible for your account, credentials, and activity under your account. You must provide accurate account information and keep your
            login secure. Notify us if you believe your account has been compromised.
          </p>
        </section>

        <section>
          <h2>Your content</h2>
          <p>
            You keep ownership of the audio, transcripts, notes, and other content you submit to Resona. You grant Resona the limited right to process,
            store, transmit, and display your content only as needed to operate the service, provide user-facing features, secure the service, and comply
            with law.
          </p>
          <p>
            You are responsible for having the rights and permissions needed to upload or record conversation content, including any notice or consent
            required by applicable law.
          </p>
        </section>

        <section>
          <h2>Acceptable use</h2>
          <p>You agree not to use Resona to:</p>
          <ul>
            <li>Violate laws, privacy rights, intellectual property rights, or contractual obligations.</li>
            <li>Upload content you are not allowed to process or share.</li>
            <li>Attempt to access another user&apos;s account or data.</li>
            <li>Interfere with the security, reliability, or operation of the service.</li>
            <li>Use the service to generate spam, harassment, deception, or unlawful automated actions.</li>
            <li>Reverse engineer, scrape, or abuse non-public parts of the service.</li>
          </ul>
        </section>

        <section>
          <h2>Google Calendar actions</h2>
          <p>
            Google Calendar integration is optional. Resona may suggest calendar events from conversation content, but calendar events are created only
            after you approve the suggested action. You are responsible for reviewing event title, timing, description, and attendees before approval.
          </p>
        </section>

        <section>
          <h2>AI output</h2>
          <p>
            Resona uses AI systems to transcribe and extract information. AI output may be incomplete, delayed, or inaccurate. Do not rely on Resona as
            the sole source for legal, medical, financial, safety-critical, or emergency decisions.
          </p>
        </section>

        <section>
          <h2>Third-party services</h2>
          <p>
            Resona depends on third-party services including Supabase, Google APIs, Trigger.dev, and Vercel. Your use of Google Calendar or other
            third-party services may also be governed by those providers&apos; terms and policies.
          </p>
        </section>

        <section>
          <h2>Service changes</h2>
          <p>
            We may change, suspend, limit, or discontinue parts of Resona as the product evolves. We may also remove content or restrict access when we
            reasonably believe it is necessary to protect users, comply with law, or enforce these Terms.
          </p>
        </section>

        <section>
          <h2>Disclaimers</h2>
          <p>
            Resona is provided on an as-is and as-available basis. To the fullest extent permitted by law, we disclaim warranties of merchantability,
            fitness for a particular purpose, non-infringement, and uninterrupted or error-free operation.
          </p>
        </section>

        <section>
          <h2>Limitation of liability</h2>
          <p>
            To the fullest extent permitted by law, Resona and its operators will not be liable for indirect, incidental, special, consequential,
            exemplary, or punitive damages, or for lost profits, lost data, or business interruption arising from your use of the service.
          </p>
        </section>

        <section>
          <h2>Termination</h2>
          <p>
            You may stop using Resona at any time. We may suspend or terminate access if you violate these Terms, create risk for the service or other
            users, or use the service unlawfully.
          </p>
        </section>

        <section>
          <h2>Changes to these Terms</h2>
          <p>
            We may update these Terms as the service changes. If changes are material, we will update the date above and take reasonable steps to notify
            users through the product or another appropriate channel.
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            For questions about these Terms, contact <a href="mailto:anaybauskr@gmail.com">anaybauskr@gmail.com</a>.
          </p>
        </section>
      </article>
    </main>
  );
}
