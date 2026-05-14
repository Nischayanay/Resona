"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { Brain, CalendarDays, Download, Eye, Mail, Shield, Trash2, Unplug, UserRound, Workflow } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

type CalendarStatus = {
  connected: boolean;
  connections: { id: string; google_account_email: string; updated_at: string }[];
};

const summaryStyles = ["concise", "balanced", "detailed"] as const;
const retentionOptions = ["30 days", "90 days", "forever"] as const;

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="settings-toggle-row">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

export function SettingsControlCenter({ session }: { session: Session }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [calendar, setCalendar] = useState<CalendarStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [rememberLongTerm, setRememberLongTerm] = useState(true);
  const [priorityOnly, setPriorityOnly] = useState(true);
  const [emotionalContext, setEmotionalContext] = useState(true);
  const [opportunityDetection, setOpportunityDetection] = useState(true);
  const [retention, setRetention] = useState<(typeof retentionOptions)[number]>("forever");
  const [summaryStyle, setSummaryStyle] = useState<(typeof summaryStyles)[number]>("balanced");
  const [communicationStyle, setCommunicationStyle] = useState("Concise technical context");
  const [meetingDensity, setMeetingDensity] = useState("Moderate");

  async function loadCalendarStatus() {
    try {
      const payload = await apiFetch<CalendarStatus>(session, "/api/integrations/google-calendar/status");
      setCalendar(payload);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Could not load connected systems.");
    }
  }

  useEffect(() => {
    void loadCalendarStatus();
  }, []);

  useEffect(() => {
    const calendarStatus = searchParams.get("calendar");
    if (calendarStatus === "connected") {
      setMessage("Google Calendar connected.");
      void loadCalendarStatus();
    } else if (calendarStatus === "oauth_error") {
      setError("Google Calendar connection did not complete.");
    }
  }, [searchParams]);

  async function connectGoogleCalendar() {
    setIsConnecting(true);
    setError(null);
    setMessage(null);
    try {
      const payload = await apiFetch<{ auth_url: string }>(session, "/api/integrations/google-calendar/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ return_to: pathname })
      });
      window.location.assign(payload.auth_url);
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : "Could not start Google Calendar connection.");
      setIsConnecting(false);
    }
  }

  async function disconnectGoogleCalendar() {
    setIsDisconnecting(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(session, "/api/integrations/google-calendar/disconnect", { method: "DELETE" });
      setMessage("Google Calendar disconnected.");
      await loadCalendarStatus();
    } catch (disconnectError) {
      setError(disconnectError instanceof Error ? disconnectError.message : "Could not disconnect Google Calendar.");
    } finally {
      setIsDisconnecting(false);
    }
  }

  const connectedCalendar = calendar?.connections[0];

  return (
    <main className="home-surface settings-surface">
      <section className="settings-hero" aria-labelledby="settings-title">
        <div>
          <p className="home-kicker">Trust architecture</p>
          <h1 id="settings-title">Control what Resona remembers.</h1>
          <p>Your conversations, relationships, opportunities, and emotional context stay understandable and controllable.</p>
        </div>
        <div className="settings-archive-orbit" aria-hidden="true">
          <span>people</span>
          <span>topics</span>
          <span>opportunities</span>
          <span>follow-ups</span>
        </div>
      </section>

      {message ? (
        <div className="notice" role="status" aria-live="polite">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="notice notice-error" role="alert">
          {error}
        </div>
      ) : null}

      <div className="settings-system-list">
        <section className="settings-system-card" aria-labelledby="memory-settings-title">
          <div className="settings-system-heading">
            <Shield size={18} aria-hidden="true" />
            <div>
              <h2 id="memory-settings-title">Memory</h2>
              <p>Control what Resona remembers.</p>
            </div>
          </div>

          <div className="settings-control-group">
            <ToggleRow label="Remember recurring people, topics, and opportunities" checked={rememberLongTerm} onChange={setRememberLongTerm} />
            <div className="settings-segmented" aria-label="Session retention">
              {retentionOptions.map((option) => (
                <button type="button" key={option} data-active={retention === option} onClick={() => setRetention(option)}>
                  {option}
                </button>
              ))}
            </div>
            <button className="settings-danger-action" type="button">
              <Trash2 size={16} aria-hidden="true" />
              Delete conversation memory permanently
            </button>
          </div>
        </section>

        <section className="settings-system-card" aria-labelledby="intelligence-settings-title">
          <div className="settings-system-heading">
            <Brain size={18} aria-hidden="true" />
            <div>
              <h2 id="intelligence-settings-title">Intelligence</h2>
              <p>Shape how Resona helps you think.</p>
            </div>
          </div>

          <div className="settings-control-group">
            <div className="settings-segmented" aria-label="Summary style">
              {summaryStyles.map((style) => (
                <button type="button" key={style} data-active={summaryStyle === style} onClick={() => setSummaryStyle(style)}>
                  {style}
                </button>
              ))}
            </div>
            <ToggleRow label="Surface only high-signal moments" checked={priorityOnly} onChange={setPriorityOnly} />
            <ToggleRow label="Detect emotional tone and stress signals" checked={emotionalContext} onChange={setEmotionalContext} />
            <ToggleRow label="Highlight opportunities and unresolved loops" checked={opportunityDetection} onChange={setOpportunityDetection} />
          </div>
        </section>

        <section className="settings-system-card" aria-labelledby="integrations-settings-title">
          <div className="settings-system-heading">
            <Workflow size={18} aria-hidden="true" />
            <div>
              <h2 id="integrations-settings-title">Connected systems</h2>
              <p>Expand what Resona can do after you approve actions.</p>
            </div>
          </div>

          <div className="integration-grid">
            <article className="integration-card">
              <CalendarDays size={18} aria-hidden="true" />
              <div>
                <h3>Google Calendar</h3>
                <p>
                  {connectedCalendar
                    ? `Connected - ${connectedCalendar.google_account_email}`
                    : calendar
                      ? "Create events only after approval."
                      : "Checking connection..."}
                </p>
              </div>
              {calendar?.connected ? (
                <button type="button" onClick={() => void disconnectGoogleCalendar()} disabled={isDisconnecting}>
                  <Unplug size={14} aria-hidden="true" />
                  {isDisconnecting ? "Disconnecting" : "Disconnect"}
                </button>
              ) : (
                <button type="button" onClick={() => void connectGoogleCalendar()} disabled={isConnecting}>
                  {isConnecting ? "Connecting" : "Connect"}
                </button>
              )}
            </article>

            <article className="integration-card" aria-disabled="true">
              <Mail size={18} aria-hidden="true" />
              <div>
                <h3>Gmail</h3>
                <p>Draft follow-ups when you choose to connect it.</p>
              </div>
              <button type="button" disabled>
                Future
              </button>
            </article>

            <article className="integration-card" aria-disabled="true">
              <UserRound size={18} aria-hidden="true" />
              <div>
                <h3>Notion</h3>
                <p>Send structured memories into your workspace.</p>
              </div>
              <button type="button" disabled>
                Future
              </button>
            </article>

            <article className="integration-card" aria-disabled="true">
              <Workflow size={18} aria-hidden="true" />
              <div>
                <h3>Future MCP tools</h3>
                <p>Add new actions without making memory feel noisy.</p>
              </div>
              <button type="button" disabled>
                Future
              </button>
            </article>
          </div>
        </section>

        <section className="settings-system-card" aria-labelledby="privacy-settings-title">
          <div className="settings-system-heading">
            <Eye size={18} aria-hidden="true" />
            <div>
              <h2 id="privacy-settings-title">Privacy</h2>
              <p>Your conversations belong to you.</p>
            </div>
          </div>

          <div className="privacy-action-list">
            <button type="button">
              <Download size={16} aria-hidden="true" />
              Download your memory archive
            </button>
            <button type="button">
              <Eye size={16} aria-hidden="true" />
              See how Resona processes conversations
            </button>
            <button className="settings-danger-action" type="button">
              <Trash2 size={16} aria-hidden="true" />
              Delete all stored memory
            </button>
          </div>
        </section>

        <section className="settings-system-card" aria-labelledby="profile-settings-title">
          <div className="settings-system-heading">
            <UserRound size={18} aria-hidden="true" />
            <div>
              <h2 id="profile-settings-title">Profile</h2>
              <p>Your cognitive identity, not a social profile.</p>
            </div>
          </div>

          <div className="profile-grid">
            <label className="field">
              <span className="label">Name</span>
              <input className="input" defaultValue={session.user.email?.split("@")[0] ?? ""} />
            </label>
            <label className="field">
              <span className="label">Timezone</span>
              <input className="input" defaultValue={Intl.DateTimeFormat().resolvedOptions().timeZone} />
            </label>
            <label className="field">
              <span className="label">Preferred communication style</span>
              <input className="input" value={communicationStyle} onChange={(event) => setCommunicationStyle(event.target.value)} />
            </label>
            <label className="field">
              <span className="label">Meeting density</span>
              <input className="input" value={meetingDensity} onChange={(event) => setMeetingDensity(event.target.value)} />
            </label>
          </div>
        </section>
      </div>
    </main>
  );
}
