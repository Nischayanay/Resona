"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { ArrowUpRight, FileAudio, RefreshCw, Search } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import type { ResonaSession } from "@/components/app/types";

type SessionsResponse = {
  sessions: ResonaSession[];
};

function formatThreadDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const day = new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(date);
  const dateText = new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(date);
  return `${day} - ${dateText}`;
}

function statusCopy(status: ResonaSession["status"]) {
  if (status === "completed") {
    return "Opportunities, people, actions, and transcript are ready.";
  }
  if (status === "failed" || status === "partial_failed") {
    return "Extraction needs attention.";
  }
  return "Audio is still moving through the intelligence engines.";
}

export function ConversationsIndex({ session }: { session: Session }) {
  const [sessions, setSessions] = useState<ResonaSession[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setError(null);
    try {
      const payload = await apiFetch<SessionsResponse>(session, "/api/sessions");
      setSessions(payload.sessions);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load conversations.");
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void loadSessions();
    const interval = window.setInterval(() => {
      void loadSessions();
    }, 5000);
    return () => window.clearInterval(interval);
  }, [loadSessions]);

  const visibleSessions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return sessions;
    }
    return sessions.filter((item) =>
      [item.title, item.source_type, item.status, item.summary ?? ""].some((value) => value.toLowerCase().includes(normalizedQuery))
    );
  }, [query, sessions]);

  return (
    <main className="conversations-surface">
      <section className="conversations-hero" aria-labelledby="conversations-title">
        <p className="home-kicker">Conversation memory</p>
        <div className="conversations-hero-row">
          <div>
            <h1 id="conversations-title">Recorded conversations</h1>
            <p>Open an audio memory to review the opportunities, people, follow-ups, actions, and transcript extracted by Resona.</p>
          </div>
          <button className="button button-secondary" type="button" onClick={() => void loadSessions()}>
            <RefreshCw size={16} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </section>

      <label className="memory-search">
        <Search size={17} aria-hidden="true" />
        <span className="sr-only">Search conversations</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people, conversations, opportunities..." />
      </label>

      {error ? (
        <div className="notice notice-error" role="alert">
          {error}
        </div>
      ) : null}

      <section className="conversation-memory-list" aria-label="Conversation recordings">
        {isLoading ? (
          <div className="empty-state">Loading conversation memories...</div>
        ) : visibleSessions.length === 0 ? (
          <div className="empty-state">{sessions.length === 0 ? "No conversations yet. Start a recording from Home." : "No conversations match this search."}</div>
        ) : (
          visibleSessions.map((item) => (
            <Link className="conversation-memory-card" href={`/conversations/${item.id}`} key={item.id}>
              <div className="conversation-memory-icon" aria-hidden="true">
                <FileAudio size={18} />
              </div>
              <div className="conversation-memory-main">
                <div className="conversation-memory-title-row">
                  <h2>{item.title}</h2>
                </div>
                <p className="conversation-memory-summary">{item.summary ?? statusCopy(item.status)}</p>
                <div className="conversation-memory-meta">
                  <span>{formatThreadDate(item.created_at)}</span>
                  <span>{item.source_type}</span>
                </div>
              </div>
              <span className="conversation-open-indicator">
                Open
                <ArrowUpRight size={15} aria-hidden="true" />
              </span>
            </Link>
          ))
        )}
      </section>
    </main>
  );
}
