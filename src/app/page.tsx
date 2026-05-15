import Link from "next/link";

const fragments = [
  "Rahul mentioned the intro",
  "May 16 - 4 PM",
  "AI infrastructure thread",
  "send the resume",
  "why it mattered",
  "memory is reconnecting",
  "not another note",
  "tomorrow evening"
];

const productCards = [
  {
    label: "Most important now",
    title: "Follow up with Rahul",
    lines: ["Internship opportunity discussed", "AI infrastructure role", "Meeting tomorrow - 4 PM"]
  },
  {
    label: "Context",
    title: "You mentioned AI infrastructure",
    lines: ["4 times this week.", "Resona kept the thread open."]
  },
  {
    label: "Ambient memory",
    title: "Important conversations resurfaced",
    lines: ["before they were forgotten.", "No transcript digging required."]
  }
];

const relationshipNodes = [
  { name: "Rahul", meta: "internship - AI infra" },
  { name: "Resona", meta: "memory layer" },
  { name: "Follow-up", meta: "May 16 - 4 PM" },
  { name: "Positioning", meta: "not meeting notes" },
  { name: "Opportunity", meta: "Infralabs" }
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
          <span className="landing-brand-mark">R</span>
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
          <p className="landing-kicker">Conversation memory for real life</p>
          <h1 id="landing-title">
            <span>Conversations disappear too fast.</span>
            <span>Resona remembers what mattered.</span>
          </h1>
          <p className="hero-support editorial-copy">A quiet intelligence layer for people, opportunities, commitments, and the emotional context you cannot keep carrying alone.</p>
          <div className="landing-actions">
            <Link className="landing-button landing-button-primary" href="/sign-up">
              Start Remembering
            </Link>
            <Link className="landing-button landing-button-secondary" href="/home">
              Watch Conversation Demo
            </Link>
          </div>
        </div>
        <AmbientMemoryArtwork />
      </section>

      <section className="problem-section reveal-section" aria-labelledby="problem-title">
        <p className="landing-kicker">Chaos</p>
        <h2 id="problem-title" className="sr-only">
          What conversation overload feels like
        </h2>
        <div className="problem-lines">
          <p>You meet incredible people.</p>
          <p>Have meaningful conversations.</p>
          <p>Discuss ideas that could change your life.</p>
          <p>Then forget most of it.</p>
        </div>
        <div className="fading-notes" aria-hidden="true">
          <span>send resume</span>
          <span>follow up tomorrow</span>
          <span>AI infrastructure</span>
          <span>why it mattered</span>
        </div>
      </section>

      <section className="shift-section reveal-section" aria-labelledby="shift-title">
        <div>
          <p className="landing-kicker">Relief</p>
          <h2 id="shift-title">Resona turns conversations into clarity.</h2>
        </div>
        <div className="clarity-flow" aria-label="Conversation to action flow">
          <span>Conversation</span>
          <span>Understanding</span>
          <span>Memory</span>
          <span>Action</span>
        </div>
      </section>

      <section className="experience-section reveal-section" aria-labelledby="experience-title">
        <div className="section-heading">
          <p className="landing-kicker">Intelligence</p>
          <h2 id="experience-title">A quiet surface for what deserves attention.</h2>
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
          <h2 id="graph-title">People, ideas, and opportunities stay softly connected.</h2>
        </div>
        <div className="memory-topology" aria-hidden="true">
          <div className="topology-line topology-line-a" />
          <div className="topology-line topology-line-b" />
          <div className="topology-line topology-line-c" />
          {relationshipNodes.map((node, index) => (
            <div className={`topology-node topology-node-${index + 1}`} key={node.name}>
              <strong>{node.name}</strong>
              <span>{node.meta}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="trust-section reveal-section" id="about" aria-labelledby="trust-title">
        <div className="trust-copy">
          <p className="landing-kicker">Calmness</p>
          <h2 id="trust-title">Your conversations belong to you.</h2>
          <p>Control what Resona remembers. Control what it forgets.</p>
        </div>
        <div className="trust-list">
          <span>Private by default</span>
          <span>Approval before actions</span>
          <span>Memory you can review</span>
        </div>
      </section>

      <section className="final-cta" aria-labelledby="final-title">
        <p className="landing-kicker">Resona</p>
        <h2 id="final-title">Never lose an important conversation again.</h2>
        <Link className="landing-button landing-button-primary" href="/sign-up">
          Start Remembering
        </Link>
      </section>

      <footer className="landing-footer" aria-label="Resona footer">
        <div className="landing-footer-grid">
          <div className="landing-footer-brand">
            <Link className="landing-brand" href="/" aria-label="Resona home">
              <span className="landing-brand-mark">R</span>
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
        </div>

        <div className="landing-footer-bottom">
          <span>© 2026 Resona. All rights reserved.</span>
          <div>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
