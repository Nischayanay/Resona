import Link from "next/link";

const fragments = [
  "they mentioned the intro",
  "May 16 - 4 PM",
  "the real ask",
  "send the deck",
  "why it mattered",
  "memory is reconnecting",
  "not another note",
  "tomorrow evening"
];

const productCards = [
  {
    label: "Priority surfaced",
    title: "Follow up before the window closes",
    lines: ["Rahul mentioned an AI infrastructure internship.", "Resona turns that into the next move, not another forgotten note."]
  },
  {
    label: "Context kept",
    title: "Know why this person matters",
    lines: ["People, dates, emotional cues, and decisions stay attached to the conversation."]
  },
  {
    label: "Action approved",
    title: "Calendar and task suggestions wait for you",
    lines: ["Resona suggests the follow-up.", "You decide what gets created."]
  }
];

const relationshipNodes = [
  { name: "Send the deck", meta: "promised after the call" },
  { name: "Warm intro", meta: "ask before Friday" },
  { name: "Follow-up", meta: "tomorrow - 4 PM" },
  { name: "Decision owner", meta: "needs the short version" },
  { name: "Open question", meta: "pricing came up twice" }
];

const topologyChips = [
  "message becomes task",
  "date becomes reminder",
  "promise becomes priority",
  "context stays attached"
];

const faqs = [
  {
    question: "What is Resona?",
    answer:
      "Resona is an AI memory layer for real conversations. It remembers people, opportunities, follow-ups, decisions, and context after the conversation ends."
  },
  {
    question: "How is Resona different from a meeting notes app?",
    answer:
      "Meeting notes store what was said. Resona focuses on what deserves attention next: who matters, what changed, what to remember, and what action needs approval."
  },
  {
    question: "Can Resona create calendar events automatically?",
    answer:
      "Resona can suggest calendar actions, but the product keeps approval in the user’s hands. You approve only the calendar events you actually want created."
  },
  {
    question: "Who should use Resona?",
    answer:
      "Founders, students, operators, creators, and builders who meet people often and cannot afford to lose follow-ups, intros, opportunities, or relationship context."
  },
  {
    question: "Does Resona remember personal context?",
    answer:
      "Yes. Resona is designed to preserve useful conversation context such as people, relationships, opportunities, decisions, and durable memory facts."
  },
  {
    question: "Is my conversation data controllable?",
    answer:
      "Yes. The product direction is privacy-first: users should be able to review memory, control what is remembered, and choose what actions Resona takes."
  }
];

function AmbientMemoryArtwork() {
  return (
    <div className="memory-art" aria-hidden="true">
      <div className="memory-thread memory-thread-a" />
      <div className="memory-thread memory-thread-b" />
      <div className="memory-thread memory-thread-c" />
      <div className="memory-core">
        <span>meaning reconnecting</span>
      </div>
      {fragments.map((fragment, index) => (
        <span className={`memory-fragment memory-fragment-${index + 1}`} key={fragment}>
          {fragment}
        </span>
      ))}
      <span className="memory-time memory-time-a">14:26</span>
      <span className="memory-time memory-time-b">yesterday</span>
      <span className="memory-time memory-time-c">unresolved</span>
      <span className="memory-particle memory-particle-a" />
      <span className="memory-particle memory-particle-b" />
      <span className="memory-particle memory-particle-c" />
      <span className="memory-particle memory-particle-d" />
    </div>
  );
}

export default function Home() {
  return (
    <main className="resona-landing">
      <nav className="landing-nav" aria-label="Main navigation">
        <Link className="landing-brand" href="/" aria-label="Resona home">
          <img className="landing-brand-mark" src="/resona-memory-orbit.svg" alt="" />
          <span>Resona</span>
        </Link>
        <div className="landing-nav-links">
          <Link href="/">Home</Link>
          <a href="#memory">Memory</a>
          <a href="#about">About</a>
        </div>
        <Link className="landing-nav-cta" href="/sign-up">
          Get Started
        </Link>
      </nav>

      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="hero-copy">
          <p className="landing-kicker">AI memory for conversations that matter</p>
          <h1 id="landing-title">
            <span>Stop losing the conversations</span>
            <span>that could change your life.</span>
          </h1>
          <p className="hero-support editorial-copy">Resona turns messy conversations into memory, priority, and approved actions, so people, opportunities, and promises do not fade after the call ends.</p>
          <div className="landing-actions">
            <Link className="landing-button landing-button-primary" href="/sign-up">
              Start Your Memory Thread
            </Link>
            <Link className="landing-button landing-button-secondary" href="/home">
              Try The Capture Flow
            </Link>
          </div>
          <div className="hero-proof-strip" aria-label="Resona output examples">
            <span>Follow-ups</span>
            <span>People</span>
            <span>Opportunities</span>
            <span>Memory facts</span>
          </div>
        </div>
        <AmbientMemoryArtwork />
      </section>

      <section className="problem-section problem-relief-section reveal-section" aria-labelledby="problem-title">
        <div className="problem-relief-copy">
          <p className="landing-kicker">From chaos to clarity</p>
          <h2 id="problem-title">The hard part is not recording a conversation. It is remembering what deserves action.</h2>
          <div className="problem-lines">
            <p>You meet someone important.</p>
            <p>You promise a follow-up.</p>
            <p>The context disappears into your day.</p>
          </div>
        </div>
        <div className="relief-panel">
          <div className="fading-notes" aria-hidden="true">
            <span>send resume</span>
            <span>follow up tomorrow</span>
            <span>AI infrastructure</span>
            <span>why it mattered</span>
          </div>
          <div className="clarity-flow" aria-label="Conversation to action flow">
            <span>Capture the conversation</span>
            <span>Extract what mattered</span>
            <span>Rank the next move</span>
            <span>Approve the action</span>
          </div>
        </div>
      </section>

      <section className="experience-section reveal-section" aria-labelledby="experience-title">
        <div className="section-heading">
          <p className="landing-kicker">Attention surface</p>
          <h2 id="experience-title">Resona shows the useful thing first.</h2>
        </div>
        <div className="calm-card-grid">
          {productCards.map((card, index) => (
            <article className={`calm-card ${index === 0 ? "calm-card-primary priority-card" : "signal-card"}`} key={card.title}>
              <p>{card.label}</p>
              <h3>{card.title}</h3>
              {card.lines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </article>
          ))}
        </div>
      </section>

      <section className="graph-section reveal-section" id="memory" aria-labelledby="graph-title">
        <div className="section-heading">
          <p className="landing-kicker">Continuity</p>
          <h2 id="graph-title">The messy after-meeting part gets organized.</h2>
        </div>
        <div className="memory-topology" aria-label="Example of conversation memory signals">
          <div className="topology-line topology-line-a" />
          <div className="topology-line topology-line-b" />
          <div className="topology-line topology-line-c" />
          <div className="topology-line topology-line-d" />
          <div className="topology-hub">
            <img src="/resona-memory-orbit.svg" alt="" />
            <span>one conversation</span>
            <strong>connected memory</strong>
          </div>
          {topologyChips.map((chip, index) => (
            <span className={`topology-chip topology-chip-${index + 1}`} key={chip}>
              {chip}
            </span>
          ))}
          {relationshipNodes.map((node, index) => (
            <div className={`topology-node topology-node-${index + 1}`} key={node.name}>
              <small>{String(index + 1).padStart(2, "0")}</small>
              <strong>{node.name}</strong>
              <span>{node.meta}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="trust-section trust-conversion-section reveal-section" id="about" aria-labelledby="trust-title">
        <div className="trust-copy">
          <p className="landing-kicker">Trust before automation</p>
          <h2 id="trust-title">Resona remembers quietly. You stay in control.</h2>
          <p>Approve actions before they happen. Review what gets remembered. Keep the product calm enough to trust.</p>
          <div className="trust-cta-card">
            <span>Start with one conversation</span>
            <strong>Upload or record. Resona will show the next move.</strong>
            <Link className="landing-button landing-button-primary" href="/sign-up">
              Start Remembering
            </Link>
          </div>
        </div>
        <div className="trust-stack">
          <div className="trust-list">
            <span>Approval before calendar or task actions</span>
            <span>Memory facts you can review</span>
            <span>Built for people and opportunities, not transcript hoarding</span>
          </div>
          <div className="faq-list compact-faq" aria-labelledby="faq-title">
            <h3 id="faq-title">Questions before trusting a memory product</h3>
            {faqs.map((faq) => (
              <details className="faq-item" key={faq.question}>
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="landing-footer" aria-label="Resona footer">
        <div className="landing-footer-grid">
          <div className="landing-footer-brand">
            <Link className="landing-brand" href="/" aria-label="Resona home">
              <img className="landing-brand-mark" src="/resona-memory-orbit.svg" alt="" />
              <span>Resona</span>
            </Link>
            <p>Conversations should remember what mattered.</p>
          </div>

          <nav className="landing-footer-group" aria-label="Product links">
            <h2>Product</h2>
            <a href="#memory">Memory</a>
            <Link href="/home">Capture</Link>
            <Link href="/sign-up">Start Remembering</Link>
          </nav>

          <nav className="landing-footer-group" aria-label="Intelligence links">
            <h2>Intelligence</h2>
            <span>People</span>
            <span>Opportunities</span>
            <span>Follow-ups</span>
          </nav>

          <nav className="landing-footer-group" aria-label="Company links">
            <h2>Company</h2>
            <Link href="/sign-in">Sign In</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </nav>

          <nav className="landing-footer-group" aria-label="Social links">
            <h2>Connect</h2>
            <a href="https://x.com/anaybauskar" target="_blank" rel="noreferrer">
              X (Twitter)
            </a>
            <a href="https://www.linkedin.com/in/anay-bauskar" target="_blank" rel="noreferrer">
              LinkedIn
            </a>
            <a href="https://heyiamanay.vercel.app/" target="_blank" rel="noreferrer">
              ✦ Personal brand
            </a>
          </nav>
        </div>

        <div className="landing-footer-bottom">
          <span>© 2026 Resona. All rights reserved.</span>
          <div>
            <a href="https://x.com/anaybauskar" target="_blank" rel="noreferrer">
              X
            </a>
            <a href="https://www.linkedin.com/in/anay-bauskar" target="_blank" rel="noreferrer">
              LinkedIn
            </a>
            <a href="https://heyiamanay.vercel.app/" target="_blank" rel="noreferrer">
              ✦ Anay
            </a>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
