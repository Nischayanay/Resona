"use client";

import Link from "next/link";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { ArrowLeft, CalendarPlus, CheckCircle2, ExternalLink, RefreshCw, X } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { StatusChip } from "@/components/app/StatusChip";
import type { ActionItem, FollowUp, MemoryFact, Opportunity, Person, SessionDetail, ToolAction } from "@/components/app/types";

type SessionInsight = NonNullable<SessionDetail["session_insights"]>[number];
type PrioritySignal = NonNullable<SessionDetail["priority_signals"]>[number];
type DecisionState = "done" | "skip";

type RelationshipConnection = {
  label: string;
  type: "Action" | "Follow-up" | "Opportunity" | "Memory" | "Calendar";
};

type PersonRelationship = {
  person: Person;
  connections: RelationshipConnection[];
};

function dateLabel(value?: string | null) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function threadDateLabel(value: string) {
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
  const timeText = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
  return `${day} - ${dateText} - ${timeText}`;
}

function statusWord(status: string) {
  if (status === "completed") {
    return "crystallized";
  }
  if (status === "failed" || status === "partial_failed") {
    return "needs care";
  }
  if (status === "queued" || status === "uploaded") {
    return "warming up";
  }
  return "thinking";
}

function firstSentence(value?: string | null) {
  if (!value) {
    return "Resona is still building the ledger for this conversation.";
  }
  const normalized = value.trim().replace(/\s+/g, " ");
  const match = normalized.match(/^(.+?[.!?])(\s|$)/);
  return match?.[1] ?? normalized;
}

function normalizeLabel(value?: string | null) {
  if (!value) {
    return "Signal";
  }
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function uniqueConnections(connections: RelationshipConnection[]) {
  const seen = new Set<string>();
  return connections.filter((connection) => {
    const key = `${connection.type}:${connection.label}`.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function includesPerson(value: string | null | undefined, person: Person) {
  const haystack = value?.toLowerCase() ?? "";
  const name = person.name.toLowerCase();
  const email = person.email?.toLowerCase();
  return Boolean(haystack && (haystack.includes(name) || (email && haystack.includes(email))));
}

function buildRelationshipMap(detail: SessionDetail, calendarActions: ToolAction[]): PersonRelationship[] {
  return detail.people
    .map((person) => {
      const connections: RelationshipConnection[] = [];

      for (const item of detail.action_items) {
        if (includesPerson(item.owner_name, person) || includesPerson(item.description, person) || includesPerson(item.title, person)) {
          connections.push({ label: item.title, type: "Action" });
        }
      }

      for (const item of detail.follow_ups) {
        if (includesPerson(item.reason, person) || includesPerson(item.suggested_message, person)) {
          connections.push({ label: item.reason, type: "Follow-up" });
        }
      }

      for (const item of detail.opportunities) {
        if (includesPerson(item.title, person) || includesPerson(item.description, person)) {
          connections.push({ label: item.title, type: "Opportunity" });
        }
      }

      for (const item of detail.memory_facts) {
        if (includesPerson(item.fact, person) || includesPerson(item.category, person)) {
          connections.push({ label: item.fact, type: "Memory" });
        }
      }

      for (const action of calendarActions) {
        const attendeeMatch = action.payload_json.attendees?.some((attendee) => includesPerson(attendee.name, person) || includesPerson(attendee.email, person));
        if (attendeeMatch || includesPerson(action.payload_json.title, person) || includesPerson(action.reason, person)) {
          connections.push({ label: action.payload_json.title ?? "Calendar event", type: "Calendar" });
        }
      }

      return { person, connections: uniqueConnections(connections).slice(0, 5) };
    })
    .sort((a, b) => {
      const aScore = a.connections.length + (a.person.relationship_context ? 2 : 0) + (a.person.role || a.person.company ? 1 : 0);
      const bScore = b.connections.length + (b.person.relationship_context ? 2 : 0) + (b.person.role || b.person.company ? 1 : 0);
      return bScore - aScore;
    });
}

function CompactEmpty({ children }: { children: React.ReactNode }) {
  return <div className="ledger-empty">{children}</div>;
}

function CollapsibleText({ text, className }: { text: string; className?: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <div className="collapsible-copy">
      <div className={`${className ?? ""} ${isExpanded ? "" : "is-clamped"}`.trim()}>{text}</div>
      <button className="show-more-button" type="button" onClick={() => setIsExpanded((value) => !value)}>
        {isExpanded ? "Show less" : "Show more"}
      </button>
    </div>
  );
}

function IntelligenceBrief({ detail, calendarActions }: { detail: SessionDetail; calendarActions: ToolAction[] }) {
  const topInsight = detail.session_insights?.[0];
  const understood = topInsight?.description || topInsight?.title || firstSentence(detail.session.summary);
  const signalCount = (detail.session_insights?.length ?? 0) + (detail.priority_signals?.length ?? 0);
  const chips = [
    { label: "Actions", value: detail.action_items.length + detail.follow_ups.length },
    { label: "People", value: detail.people.length },
    { label: "Memory", value: detail.memory_facts.length },
    { label: "Calendar", value: calendarActions.length },
    { label: "Signals", value: signalCount }
  ];

  return (
    <section className="ledger-brief" aria-labelledby="session-title">
      <div className="ledger-brief-meta">
        <span>Intelligence Ledger</span>
        <span>{threadDateLabel(detail.session.created_at)}</span>
        <span className="session-mood-chip">{statusWord(detail.session.status)}</span>
      </div>
      <div className="ledger-brief-main">
        <div>
          <h1 id="session-title">{detail.session.title}</h1>
          <p className="ledger-understood">
            <span>What Resona understood</span>
            {understood}
          </p>
        </div>
        <div className="ledger-count-grid" aria-label="Extracted session signals">
          {chips.map((chip) => (
            <div className="ledger-count-chip" key={chip.label}>
              <strong>{chip.value}</strong>
              <span>{chip.label}</span>
            </div>
          ))}
        </div>
      </div>
      {detail.session.summary ? <p className="ledger-brief-summary">{firstSentence(detail.session.summary)}</p> : null}
    </section>
  );
}

function SignalTimeline({ insights = [], signals = [] }: { insights?: SessionInsight[]; signals?: PrioritySignal[] }) {
  const rows = [
    ...insights.slice(0, 3).map((item) => ({
      id: item.id,
      label: normalizeLabel(item.insight_type),
      title: item.title,
      body: item.description || item.signal_reason,
      score: Math.round(item.confidence * 100)
    })),
    ...signals.slice(0, 2).map((item) => ({
      id: item.id,
      label: normalizeLabel(item.entity_type),
      title: item.title,
      body: item.reason,
      score: Math.round(item.final_score * 100)
    }))
  ].slice(0, 5);

  if (rows.length === 0) {
    return null;
  }

  return (
    <section className="ledger-panel signal-timeline" aria-labelledby="signals-title">
      <div className="ledger-panel-heading">
        <span>02</span>
        <h2 id="signals-title">Decision / Signal Timeline</h2>
      </div>
      <div className="timeline-list">
        {rows.map((row) => (
          <article className="timeline-row" key={`${row.label}-${row.id}`}>
            <span className="timeline-label">{row.label}</span>
            <div>
              <h3>{row.title}</h3>
              {row.body ? <p>{row.body}</p> : null}
            </div>
            <span className="timeline-score">{row.score}%</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function ActionLedger({
  actions,
  followUps,
  actionDecisions,
  followUpDecisions,
  setActionDecisions,
  setFollowUpDecisions
}: {
  actions: ActionItem[];
  followUps: FollowUp[];
  actionDecisions: Record<string, DecisionState>;
  followUpDecisions: Record<string, DecisionState>;
  setActionDecisions: React.Dispatch<React.SetStateAction<Record<string, DecisionState>>>;
  setFollowUpDecisions: React.Dispatch<React.SetStateAction<Record<string, DecisionState>>>;
}) {
  return (
    <section className="ledger-panel action-ledger-panel" aria-labelledby="actions-title">
      <div className="ledger-panel-heading">
        <span>03</span>
        <h2 id="actions-title">Action Ledger</h2>
      </div>
      <div className="ledger-row-list">
        {actions.length === 0 && followUps.length === 0 ? <CompactEmpty>No action items or follow-ups extracted yet.</CompactEmpty> : null}
        {actions.map((item) => (
          <article className="ledger-row" data-decision={actionDecisions[item.id] ?? "open"} key={item.id}>
            <div className="ledger-row-type">Task</div>
            <div className="ledger-row-content">
              <h3>{item.title}</h3>
              <p>
                {[item.description, item.owner_name ? `Owner: ${item.owner_name}` : null, dateLabel(item.due_at) ? `Due: ${dateLabel(item.due_at)}` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div className="ledger-action-controls" aria-label={`Decision for ${item.title}`}>
              <button type="button" onClick={() => setActionDecisions((current) => ({ ...current, [item.id]: "done" }))}>
                Mark Done
              </button>
              <button type="button" onClick={() => setActionDecisions((current) => ({ ...current, [item.id]: "skip" }))}>
                Not Needed
              </button>
            </div>
          </article>
        ))}
        {followUps.map((item) => (
          <article className="ledger-row" data-decision={followUpDecisions[item.id] ?? "open"} key={item.id}>
            <div className="ledger-row-type">Follow-up</div>
            <div className="ledger-row-content">
              <h3>{item.reason}</h3>
              <p>{[item.suggested_message, dateLabel(item.suggested_date) ? `Suggested: ${dateLabel(item.suggested_date)}` : null].filter(Boolean).join(" · ")}</p>
            </div>
            <div className="ledger-action-controls" aria-label={`Decision for ${item.reason}`}>
              <button type="button" onClick={() => setFollowUpDecisions((current) => ({ ...current, [item.id]: "done" }))}>
                Mark Done
              </button>
              <button type="button" onClick={() => setFollowUpDecisions((current) => ({ ...current, [item.id]: "skip" }))}>
                Dismiss
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function RelationshipMap({ relationships }: { relationships: PersonRelationship[] }) {
  return (
    <section className="ledger-panel relationship-map-panel" aria-labelledby="relationships-title">
      <div className="ledger-panel-heading">
        <span>04</span>
        <h2 id="relationships-title">Relationship Map</h2>
      </div>
      <div className="relationship-list">
        {relationships.length === 0 ? <CompactEmpty>No people extracted yet.</CompactEmpty> : null}
        {relationships.map(({ person, connections }) => (
          <article className="relationship-card" key={person.id}>
            <div>
              <h3>{person.name}</h3>
              <p>{[person.role, person.company, person.email].filter(Boolean).join(" · ") || "Mentioned in this session"}</p>
            </div>
            {person.relationship_context || person.notes ? <p className="relationship-context">{person.relationship_context ?? person.notes}</p> : null}
            {connections.length > 0 ? (
              <div className="connection-chip-list" aria-label={`Connections for ${person.name}`}>
                {connections.map((connection) => (
                  <span className="connection-chip" key={`${person.id}-${connection.type}-${connection.label}`}>
                    {connection.type}: {connection.label}
                  </span>
                ))}
              </div>
            ) : (
              <span className="relationship-muted">Mentioned in this session</span>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function CalendarSuggestionList({
  items,
  isActing,
  approveToolAction,
  dismissToolAction
}: {
  items: ToolAction[];
  isActing: string | null;
  approveToolAction: (action: ToolAction) => Promise<void>;
  dismissToolAction: (action: ToolAction) => Promise<void>;
}) {
  return (
    <section className="ledger-panel calendar-ledger-panel" aria-labelledby="calendar-title">
      <div className="ledger-panel-heading">
        <span>05</span>
        <h2 id="calendar-title">Calendar Suggestions</h2>
      </div>
      <div className="compact-card-list">
        {items.length === 0 ? <CompactEmpty>No calendar suggestions detected.</CompactEmpty> : null}
        {items.map((action) => (
          <article className="calendar-suggestion-card" key={action.id}>
            <div className="compact-card-title-row">
              <h3>{action.payload_json.title ?? "Calendar event"}</h3>
              <StatusChip status={action.status} />
            </div>
            <p>{action.reason}</p>
            <span>{[dateLabel(action.payload_json.start_time), dateLabel(action.payload_json.end_time)].filter(Boolean).join(" - ") || "Time not detected"}</span>
            {action.status === "suggested" ? (
              <div className="compact-action-row">
                <button type="button" disabled={isActing === action.id} onClick={() => void approveToolAction(action)}>
                  <CalendarPlus size={14} aria-hidden="true" />
                  Add to Calendar
                </button>
                <button type="button" disabled={isActing === action.id} onClick={() => void dismissToolAction(action)}>
                  Dismiss
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function MemoryWritten({ items }: { items: MemoryFact[] }) {
  return (
    <section className="ledger-panel memory-written-panel" aria-labelledby="memory-title">
      <div className="ledger-panel-heading">
        <span>06</span>
        <h2 id="memory-title">Memory Written</h2>
      </div>
      <div className="memory-fact-list">
        {items.length === 0 ? <CompactEmpty>No memory facts saved yet.</CompactEmpty> : null}
        {items.map((item) => (
          <article className="memory-fact-row" key={item.id}>
            <CheckCircle2 size={15} aria-hidden="true" />
            <div>
              <h3>{item.fact}</h3>
              <span>Saved Memory · {normalizeLabel(item.category)}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function OpportunityRail({ items }: { items: Opportunity[] }) {
  return (
    <section className="ledger-panel opportunity-rail-panel" aria-labelledby="opps-title">
      <div className="ledger-panel-heading">
        <span>07</span>
        <h2 id="opps-title">Opportunities</h2>
      </div>
      <div className="compact-card-list">
        {items.length === 0 ? <CompactEmpty>No opportunities extracted yet.</CompactEmpty> : null}
        {items.map((item) => (
          <article className="opportunity-row" key={item.id}>
            <div className="compact-card-title-row">
              <h3>{item.title}</h3>
              <span>{item.priority}</span>
            </div>
            <p>{item.description}</p>
            <small>{normalizeLabel(item.type)}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function EvidenceTranscript({ rawText }: { rawText?: string | null }) {
  return (
    <section className="ledger-panel transcript-evidence-panel" aria-labelledby="transcript-title">
      <div className="ledger-panel-heading">
        <span>08</span>
        <h2 id="transcript-title">Transcript Evidence</h2>
      </div>
      {rawText ? <CollapsibleText text={rawText} className="transcript-box" /> : <CompactEmpty>Transcript not available yet.</CompactEmpty>}
    </section>
  );
}

export function SessionDetailView({ session, backHref = "/home" }: { session: Session; backHref?: string }) {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sessionId = params.id;
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsCalendarConnect, setNeedsCalendarConnect] = useState(false);
  const [actionDecisions, setActionDecisions] = useState<Record<string, DecisionState>>({});
  const [followUpDecisions, setFollowUpDecisions] = useState<Record<string, DecisionState>>({});

  const loadDetail = useCallback(async () => {
    setError(null);
    try {
      const payload = await apiFetch<SessionDetail>(session, `/api/sessions/${sessionId}`);
      setDetail(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load this session.");
    } finally {
      setIsLoading(false);
    }
  }, [session, sessionId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (!detail || ["completed", "failed", "partial_failed"].includes(detail.session.status)) {
      return;
    }
    const interval = window.setInterval(() => {
      void loadDetail();
    }, 4000);
    return () => window.clearInterval(interval);
  }, [detail, loadDetail]);

  useEffect(() => {
    const calendarStatus = searchParams.get("calendar");
    const calendarReason = searchParams.get("calendar_reason");
    if (calendarStatus === "connected") {
      setNeedsCalendarConnect(false);
      setMessage("Google Calendar connected. Add the suggestion again to create the event.");
      setError(null);
    } else if (calendarStatus === "oauth_error") {
      setNeedsCalendarConnect(false);
      setError(
        calendarReason === "google_oauth_testing"
          ? "Google Calendar connection is blocked because this OAuth app is still in Google testing mode. Add your Google account as a test user in Google Cloud Console, or publish and verify the consent screen."
          : calendarReason === "access_denied"
            ? "Google Calendar connection was denied."
            : "Google Calendar connection failed before the app could finish the handshake."
      );
    }
  }, [searchParams]);

  async function startGoogleCalendarConnect() {
    setIsActing("connect-google-calendar");
    setError(null);

    try {
      const payload = await apiFetch<{ auth_url: string }>(session, "/api/integrations/google-calendar/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          return_to: pathname
        })
      });
      window.location.assign(payload.auth_url);
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : "Could not start Google Calendar connection.");
      setIsActing(null);
    }
  }

  async function approveToolAction(action: ToolAction) {
    setIsActing(action.id);
    setMessage(null);
    setError(null);
    setNeedsCalendarConnect(false);

    try {
      await apiFetch(session, `/api/tool-actions/${action.id}/approve`, { method: "POST" });
      setMessage("Calendar event created.");
      await loadDetail();
    } catch (actionError) {
      const typedError = actionError as Error & { code?: string; payload?: { connect_url?: string } };
      if (typedError.code === "GOOGLE_CALENDAR_NOT_CONNECTED" || typedError.payload?.connect_url) {
        setMessage("Connect Google Calendar to create this event.");
        setNeedsCalendarConnect(true);
        return;
      }
      setError(actionError instanceof Error ? actionError.message : "Could not add this event.");
    } finally {
      setIsActing(null);
    }
  }

  async function dismissToolAction(action: ToolAction) {
    setIsActing(action.id);
    setMessage(null);
    setError(null);

    try {
      await apiFetch(session, `/api/tool-actions/${action.id}/dismiss`, { method: "POST" });
      setMessage("Calendar suggestion dismissed.");
      await loadDetail();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not dismiss this suggestion.");
    } finally {
      setIsActing(null);
    }
  }

  const calendarActions = useMemo(() => detail?.tool_actions.filter((action) => action.tool_name === "google_calendar") ?? [], [detail]);
  const relationships = useMemo(() => (detail ? buildRelationshipMap(detail, calendarActions) : []), [detail, calendarActions]);

  if (isLoading) {
    return (
      <main className="app-main">
        <div className="notice" role="status">
          Loading session...
        </div>
      </main>
    );
  }

  if (!detail) {
    return (
      <main className="app-main">
        <div className="notice notice-error" role="alert">
          {error ?? "Session not found."}
        </div>
      </main>
    );
  }

  return (
    <main className="app-main session-detail-surface">
      <div className="ledger-page-stack">
        <div className="ledger-toolbar">
          <Link className="ledger-toolbar-link" href={backHref}>
            <ArrowLeft size={15} aria-hidden="true" />
            Back
          </Link>
          <button className="ledger-toolbar-link" type="button" onClick={() => void loadDetail()}>
            <RefreshCw size={15} aria-hidden="true" />
            Refresh
          </button>
        </div>

        {message ? (
          <div className="notice" role="status" aria-live="polite">
            {message}
            {needsCalendarConnect ? (
              <>
                {" "}
                <button
                  className="text-link"
                  type="button"
                  onClick={() => void startGoogleCalendarConnect()}
                  disabled={isActing === "connect-google-calendar"}
                  style={{ background: "none", border: 0, padding: 0, cursor: "pointer" }}
                >
                  {isActing === "connect-google-calendar" ? "Connecting..." : "Connect now"}{" "}
                  <ExternalLink size={12} aria-hidden="true" style={{ display: "inline" }} />
                </button>
              </>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <div className="notice notice-error" role="alert">
            {error}
          </div>
        ) : null}

        <IntelligenceBrief detail={detail} calendarActions={calendarActions} />

        <div className="ledger-command-grid">
          <div className="ledger-main-column">
            <SignalTimeline insights={detail.session_insights} signals={detail.priority_signals} />
            <ActionLedger
              actions={detail.action_items}
              followUps={detail.follow_ups}
              actionDecisions={actionDecisions}
              followUpDecisions={followUpDecisions}
              setActionDecisions={setActionDecisions}
              setFollowUpDecisions={setFollowUpDecisions}
            />
          </div>

          <aside className="ledger-side-column" aria-label="Relationship and memory intelligence">
            <RelationshipMap relationships={relationships} />
            <CalendarSuggestionList items={calendarActions} isActing={isActing} approveToolAction={approveToolAction} dismissToolAction={dismissToolAction} />
            <MemoryWritten items={detail.memory_facts} />
            <OpportunityRail items={detail.opportunities} />
          </aside>

          <EvidenceTranscript rawText={detail.transcript?.raw_text} />
        </div>
      </div>
    </main>
  );
}
