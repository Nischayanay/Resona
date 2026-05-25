import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowDown, ArrowUpRight, CalendarCheck, Check, Download, ShieldCheck } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const noticeRows = [
  { index: "01", label: "Person", title: "Rahul from the demo night", detail: "Asked for the short deck before Friday." },
  { index: "02", label: "Promise", title: "Send the new intro", detail: "Mentioned after the pricing question." },
  { index: "03", label: "Date", title: "Tomorrow evening", detail: "Good window for a calm follow-up." },
  { index: "04", label: "Opening", title: "AI infrastructure internship", detail: "Needs one paragraph and the right proof." },
  { index: "05", label: "Decision", title: "Wait for approval", detail: "Nothing reaches calendar until you say yes." }
];

const proofItems = ["people", "promises", "dates", "openings", "decisions", "context"];

const processSteps = [
  {
    number: "01",
    title: "You talk.",
    copy: "A call, a hallway chat, a late-night idea, a promise made too quickly."
  },
  {
    number: "02",
    title: "Vynora remembers what mattered.",
    copy: "Names, asks, dates, emotional weight, and the reason it mattered stay together."
  },
  {
    number: "03",
    title: "The thread comes back when it counts.",
    copy: "The right follow-up sits above the noise before the moment goes cold."
  },
  {
    number: "04",
    title: "You choose the next move.",
    copy: "Calendar and task suggestions wait for your approval. Quiet by default."
  }
];

const trustItems = [
  { icon: ShieldCheck, title: "Review memory", copy: "See what Vynora keeps from your conversations." },
  { icon: Download, title: "Export your archive", copy: "Take your conversation memory out when you need it." },
  { icon: CalendarCheck, title: "Approve actions", copy: "Calendar events and follow-ups happen only after you decide." }
];

const faqs = [
  {
    question: "Is Vynora another meeting notes app?",
    answer:
      "No. Notes preserve a transcript. Vynora focuses on the person, promise, date, opening, and decision you meant to come back to."
  },
  {
    question: "Will it create calendar events by itself?",
    answer:
      "No. Vynora can suggest a calendar action, but the user approves the title, timing, and details before anything is created."
  },
  {
    question: "Who is this for?",
    answer:
      "Founders, students, operators, builders, and creators who meet people often and cannot afford to lose warm openings or important promises."
  }
];

function IssueBar() {
  return (
    <div className="vy-issue-bar" aria-label="Vynora issue metadata">
      <span>
        <strong>VY / 2026</strong> · VOL. 01 / ISSUE N° 01
      </span>
      <span>
        FILED UNDER <b>MEMORY · CONVERSATION</b>
      </span>
      <span>LOCAL-FIRST · HUMAN APPROVED</span>
      <span>
        <i aria-hidden="true" /> LIVE · V0.1
      </span>
    </div>
  );
}

function SideRail({ side }: { side: "left" | "right" }) {
  return (
    <aside className={`vy-side-rail vy-side-rail-${side}`} aria-hidden="true">
      <span>{side === "left" ? "PEOPLE · PROMISES · OPENINGS · MEMORY" : "VYNORA · VOL. 01 · ISSUE N° 01 · CONTROL"}</span>
    </aside>
  );
}

function ArtPlate() {
  return (
    <div className="vy-art-wrap" aria-label="Vynora abstract memory artwork">
      <div className="vy-art-corner vy-art-corner-a" />
      <div className="vy-art-corner vy-art-corner-b" />
      <div className="vy-art-plate">
        <Image
          src="/brand/vynora-hero-art.png"
          alt="Abstract editorial artwork showing a memory field around a classical head and architectural forms"
          fill
          priority
          sizes="(max-width: 900px) 92vw, 48vw"
          className="vy-art-image"
        />
        <div className="vy-art-grid" aria-hidden="true" />
        <div className="vy-art-caption vy-art-caption-top">FIG. 01 / VY-01</div>
        <div className="vy-art-caption vy-art-caption-side">PLATE N° 08</div>
        <div className="vy-art-menu" aria-hidden="true">
          <span>01 NOTICE</span>
          <span>02 REMEMBER</span>
          <span>03 RETURN</span>
          <span>04 DECIDE</span>
        </div>
        <div className="vy-art-proof">SHA · a1b2c3d</div>
      </div>
    </div>
  );
}

function MemoryLedger() {
  return (
    <div className="vy-ledger">
      {noticeRows.map((row) => (
        <article className="vy-ledger-row" key={row.index}>
          <span>{row.index}</span>
          <small>{row.label}</small>
          <strong>{row.title}</strong>
          <p>{row.detail}</p>
        </article>
      ))}
    </div>
  );
}

function ProofStrip() {
  return (
    <div className="vy-proof-strip" aria-label="What Vynora remembers">
      {proofItems.map((item, index) => (
        <span style={{ "--delay": `${index * 90}ms` } as CSSProperties} key={item}>
          {item}
        </span>
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <main className="vynora-landing">
      <IssueBar />
      <SideRail side="left" />
      <SideRail side="right" />

      <nav className="vy-nav" aria-label="Main navigation">
        <Link className="vy-brand" href="/" aria-label="Vynora home">
          <img className="vy-brand-mark" src="/resona-memory-orbit.svg" alt="" />
          <span>Vynora</span>
        </Link>
        <div className="vy-nav-links">
          <a href="#notices">Notices</a>
          <a href="#remembering">Remembering</a>
          <a href="#trust">Trust</a>
        </div>
        <div className="vy-nav-actions">
          <Button asChild variant="outline" size="sm">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild className="vy-button-solid" size="sm">
            <Link href="/sign-up">Start</Link>
          </Button>
        </div>
      </nav>

      <section className="vy-hero" aria-labelledby="landing-title">
        <div className="vy-hero-copy">
          <Badge>Private conversation memory · N° 01</Badge>
          <h1 id="landing-title">
            Your conversations should be <em>remembered.</em>
          </h1>
          <p>
            Vynora keeps the person, promise, date, opening, and reason together, so the thing you meant to come back to does not fade after the call.
          </p>
          <div className="vy-actions">
            <Button asChild className="vy-button-solid" size="lg">
              <Link href="/sign-up">
                Start with one conversation
                <ArrowUpRight size={17} strokeWidth={1.8} aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild className="vy-button-outline" variant="outline" size="lg">
              <a href="#notices">
                See how it works
                <ArrowDown size={16} strokeWidth={1.8} aria-hidden="true" />
              </a>
            </Button>
          </div>
          <ProofStrip />
        </div>
        <ArtPlate />
      </section>

      <section className="vy-section vy-notices" id="notices" aria-labelledby="notices-title">
        <div className="vy-section-heading">
          <Badge>01 / What Vynora notices</Badge>
          <h2 id="notices-title">
            The important pieces stop drifting <em>apart.</em>
          </h2>
        </div>
        <MemoryLedger />
      </section>

      <section className="vy-section vy-remembering" id="remembering" aria-labelledby="remembering-title">
        <div className="vy-before-after">
          <div>
            <Badge>02 / The remembering layer</Badge>
            <h2 id="remembering-title">
              Messy notes become a living thread <em>again.</em>
            </h2>
          </div>
          <div className="vy-thread-board" aria-label="Before and after conversation memory">
            <div className="vy-scattered">
              <span>send deck?</span>
              <span>pricing came up</span>
              <span>Friday maybe</span>
              <span>intro to Mira</span>
            </div>
            <Separator />
            <div className="vy-clean-thread">
              {processSteps.map((step) => (
                <article key={step.number}>
                  <small>{step.number}</small>
                  <strong>{step.title}</strong>
                  <p>{step.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="vy-section vy-next-move" aria-labelledby="next-title">
        <div className="vy-next-copy">
          <Badge>03 / Your next move</Badge>
          <h2 id="next-title">
            Follow-ups feel lighter when the context is still <em>warm.</em>
          </h2>
          <p>
            Vynora does not try to run your relationships. It brings back the thread, shows why it matters, and keeps the final move in your hands.
          </p>
        </div>
        <div className="vy-approval-card">
          <span>Suggested, not automatic</span>
          <strong>Send a short deck to Rahul before Friday.</strong>
          <p>Reason: he asked for proof after the infrastructure internship conversation.</p>
          <div>
            <Button className="vy-approval-primary" size="sm">
              <Check size={15} strokeWidth={2} aria-hidden="true" />
              Approve
            </Button>
            <Button className="vy-approval-secondary" variant="outline" size="sm">
              Later
            </Button>
          </div>
        </div>
      </section>

      <section className="vy-section vy-trust" id="trust" aria-labelledby="trust-title">
        <div className="vy-section-heading">
          <Badge>04 / Trust and control</Badge>
          <h2 id="trust-title">
            Quiet memory. Clear control. No surprise <em>automation.</em>
          </h2>
        </div>
        <div className="vy-trust-grid">
          {trustItems.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title}>
                <Icon size={22} strokeWidth={1.7} aria-hidden="true" />
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
              </article>
            );
          })}
        </div>
        <Accordion type="single" collapsible className="vy-faq">
          {faqs.map((faq, index) => (
            <AccordionItem value={`item-${index}`} key={faq.question}>
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className="vy-final" aria-labelledby="final-title">
        <Badge>05 / Begin</Badge>
        <h2 id="final-title">
          Start with one <em>conversation.</em>
        </h2>
        <p>Let Vynora remember what you meant to come back to.</p>
        <Button asChild className="vy-button-solid" size="lg">
          <Link href="/sign-up">Start with one conversation</Link>
        </Button>
      </section>
    </main>
  );
}
