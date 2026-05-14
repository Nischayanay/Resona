"use client";

import Link from "next/link";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { ArrowLeft, Calendar, Check, ExternalLink, RefreshCw, X } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { StatusChip } from "@/components/app/StatusChip";
import type { ActionItem, FollowUp, MemoryFact, Opportunity, Person, SessionDetail, ToolAction } from "@/components/app/types";

function DataList<T>({
  items,
  empty,
  render
}: {
  items: T[];
  empty: string;
  render: (item: T) => React.ReactNode;
}) {
  if (items.length === 0) {
    return <div className="empty-state">{empty}</div>;
  }
  return <div className="data-list">{items.map(render)}</div>;
}

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
      setMessage("Google Calendar connected. Approve the suggestion again to create the event.");
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
      setMessage("Calendar action executed.");
      await loadDetail();
    } catch (actionError) {
      const typedError = actionError as Error & { code?: string; payload?: { connect_url?: string } };
      if (typedError.code === "GOOGLE_CALENDAR_NOT_CONNECTED" || typedError.payload?.connect_url) {
        setMessage("Connect Google Calendar to create this event.");
        setNeedsCalendarConnect(true);
        return;
      }
      setError(actionError instanceof Error ? actionError.message : "Could not approve this action.");
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
      setError(actionError instanceof Error ? actionError.message : "Could not dismiss this action.");
    } finally {
      setIsActing(null);
    }
  }

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

  const calendarActions = detail.tool_actions.filter((action) => action.tool_name === "google_calendar");

  return (
    <main className="app-main">
      <div className="section-stack">
        <div className="button-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <Link className="button button-secondary" href={backHref}>
            <ArrowLeft size={16} aria-hidden="true" />
            Back
          </Link>
          <button className="button button-secondary" type="button" onClick={() => void loadDetail()}>
            <RefreshCw size={16} aria-hidden="true" />
            Refresh
          </button>
        </div>

        <section className="panel" aria-labelledby="session-title">
          <div className="panel-header">
            <div>
              <h1 id="session-title" className="panel-title">
                {detail.session.title}
              </h1>
              <p className="panel-copy">
                {detail.session.source_type} · {new Date(detail.session.created_at).toLocaleString()}
              </p>
            </div>
            <StatusChip status={detail.session.status} />
          </div>
          {detail.session.summary ? (
            <div className="panel-body">
              <p className="data-item-copy" style={{ margin: 0 }}>
                {detail.session.summary}
              </p>
            </div>
          ) : null}
        </section>

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

        <div className="detail-grid">
          <div className="section-stack">
            <section className="panel" aria-labelledby="opps-title">
              <div className="panel-header">
                <div>
                  <h2 id="opps-title" className="panel-title">
                    Opportunities
                  </h2>
                  <p className="panel-copy">Internships, intros, collaborations, learning, or startup signals.</p>
                </div>
              </div>
              <div className="panel-body">
                <DataList<Opportunity>
                  items={detail.opportunities}
                  empty="No opportunities extracted yet."
                  render={(item) => (
                    <article className="data-item" key={item.id}>
                      <h3 className="data-item-title">{item.title}</h3>
                      <p className="data-item-copy">
                        {item.type} · {item.priority}
                      </p>
                      <p className="data-item-copy">{item.description}</p>
                    </article>
                  )}
                />
              </div>
            </section>

            <section className="panel" aria-labelledby="people-title">
              <div className="panel-header">
                <div>
                  <h2 id="people-title" className="panel-title">
                    People
                  </h2>
                  <p className="panel-copy">People and relationship context found in the session.</p>
                </div>
              </div>
              <div className="panel-body">
                <DataList<Person>
                  items={detail.people}
                  empty="No people extracted yet."
                  render={(person) => (
                    <article className="data-item" key={person.id}>
                      <h3 className="data-item-title">{person.name}</h3>
                      <p className="data-item-copy">{[person.role, person.company, person.email].filter(Boolean).join(" · ")}</p>
                      {person.relationship_context || person.notes ? <p className="data-item-copy">{person.relationship_context ?? person.notes}</p> : null}
                    </article>
                  )}
                />
              </div>
            </section>

            <section className="panel" aria-labelledby="transcript-title">
              <div className="panel-header">
                <div>
                  <h2 id="transcript-title" className="panel-title">
                    Transcript
                  </h2>
                  <p className="panel-copy">Source text used by the extraction pipeline.</p>
                </div>
              </div>
              <div className="panel-body">
                {detail.transcript?.raw_text ? <div className="transcript-box">{detail.transcript.raw_text}</div> : <div className="empty-state">Transcript not available yet.</div>}
              </div>
            </section>
          </div>

          <div className="section-stack">
            <section className="panel" aria-labelledby="actions-title">
              <div className="panel-header">
                <div>
                  <h2 id="actions-title" className="panel-title">
                    Actions
                  </h2>
                  <p className="panel-copy">Commitments and next steps extracted from the conversation.</p>
                </div>
              </div>
              <div className="panel-body">
                <DataList<ActionItem>
                  items={detail.action_items}
                  empty="No action items extracted yet."
                  render={(item) => (
                    <article className="data-item" key={item.id}>
                      <div className="button-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                        <h3 className="data-item-title">{item.title}</h3>
                        <StatusChip status={item.status} />
                      </div>
                      <p className="data-item-copy">
                        {[item.description, item.owner_name ? `Owner: ${item.owner_name}` : null, dateLabel(item.due_at) ? `Due: ${dateLabel(item.due_at)}` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </article>
                  )}
                />
              </div>
            </section>

            <section className="panel" aria-labelledby="calendar-title">
              <div className="panel-header">
                <div>
                  <h2 id="calendar-title" className="panel-title">
                    Calendar suggestions
                  </h2>
                  <p className="panel-copy">Approve only the events you want created.</p>
                </div>
              </div>
              <div className="panel-body">
                <DataList<ToolAction>
                  items={calendarActions}
                  empty="No calendar suggestions detected."
                  render={(action) => (
                    <article className="data-item" key={action.id}>
                      <div className="button-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                        <h3 className="data-item-title">{action.payload_json.title ?? "Calendar event"}</h3>
                        <StatusChip status={action.status} />
                      </div>
                      <p className="data-item-copy">{action.reason}</p>
                      <p className="data-item-copy">{[dateLabel(action.payload_json.start_time), dateLabel(action.payload_json.end_time)].filter(Boolean).join(" - ")}</p>
                      {action.status === "suggested" ? (
                        <div className="button-row" style={{ marginTop: 12 }}>
                          <button className="button button-primary" type="button" disabled={isActing === action.id} onClick={() => void approveToolAction(action)}>
                            <Calendar size={16} aria-hidden="true" />
                            Approve
                          </button>
                          <button className="button button-secondary" type="button" disabled={isActing === action.id} onClick={() => void dismissToolAction(action)}>
                            <X size={16} aria-hidden="true" />
                            Dismiss
                          </button>
                        </div>
                      ) : null}
                    </article>
                  )}
                />
              </div>
            </section>

            <section className="panel" aria-labelledby="followups-title">
              <div className="panel-header">
                <div>
                  <h2 id="followups-title" className="panel-title">
                    Follow-ups
                  </h2>
                  <p className="panel-copy">Suggested messages and reasons.</p>
                </div>
              </div>
              <div className="panel-body">
                <DataList<FollowUp>
                  items={detail.follow_ups}
                  empty="No follow-ups suggested yet."
                  render={(item) => (
                    <article className="data-item" key={item.id}>
                      <div className="button-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                        <h3 className="data-item-title">{item.reason}</h3>
                        <StatusChip status={item.status} />
                      </div>
                      <p className="data-item-copy">{item.suggested_message}</p>
                      {dateLabel(item.suggested_date) ? <p className="data-item-copy">Suggested: {dateLabel(item.suggested_date)}</p> : null}
                    </article>
                  )}
                />
              </div>
            </section>

            <section className="panel" aria-labelledby="memory-title">
              <div className="panel-header">
                <div>
                  <h2 id="memory-title" className="panel-title">
                    Memory facts
                  </h2>
                  <p className="panel-copy">Durable context saved from this conversation.</p>
                </div>
              </div>
              <div className="panel-body">
                <DataList<MemoryFact>
                  items={detail.memory_facts}
                  empty="No memory facts saved yet."
                  render={(item) => (
                    <article className="data-item" key={item.id}>
                      <div className="button-row" style={{ alignItems: "center" }}>
                        <Check size={15} aria-hidden="true" />
                        <h3 className="data-item-title">{item.fact}</h3>
                      </div>
                      <p className="data-item-copy">{item.category}</p>
                    </article>
                  )}
                />
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
