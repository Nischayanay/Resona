"use client";

import type { Session } from "@supabase/supabase-js";

const routeCopy = {
  conversations: {
    eyebrow: "Conversations",
    title: "Meaningful conversations will live here.",
    body: "This surface will show only conversations with action, emotion, opportunity, or unresolved memory."
  },
  memory: {
    eyebrow: "Memory",
    title: "Your living memory graph will live here.",
    body: "People, ideas, opportunities, and resurfaced context will appear as a calm topology instead of a technical graph."
  },
  settings: {
    eyebrow: "Settings",
    title: "Control what Resona remembers.",
    body: "Privacy, profile, integrations, and memory controls will stay here."
  }
} as const;

export function QuietRoutePlaceholder({ route, session }: { route: keyof typeof routeCopy; session: Session }) {
  const copy = routeCopy[route];

  return (
    <main className="home-surface">
      <section className="quiet-route-card" aria-labelledby={`${route}-title`}>
        <p className="home-kicker">{copy.eyebrow}</p>
        <h1 id={`${route}-title`}>{copy.title}</h1>
        <p>{copy.body}</p>
        <span>{session.user.email}</span>
      </section>
    </main>
  );
}
