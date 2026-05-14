"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Mic, Square, Upload, RefreshCw, Play } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { StatusChip } from "@/components/app/StatusChip";
import type { ResonaSession } from "@/components/app/types";

type UploadResponse = {
  session_id: string;
  status: string;
};

type SessionsResponse = {
  sessions: ResonaSession[];
};

const sourceTypes = ["meeting", "event", "lecture", "casual", "mentorship", "other"] as const;

function defaultTitle() {
  return `Conversation ${new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date())}`;
}

function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const rest = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

export function CaptureWorkspace({ session }: { session: Session }) {
  const router = useRouter();
  const [mode, setMode] = useState<"record" | "upload">("record");
  const [title, setTitle] = useState("");
  const [sourceType, setSourceType] = useState<(typeof sourceTypes)[number]>("meeting");
  const [file, setFile] = useState<File | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ResonaSession[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const activeAudio = mode === "upload" ? file : recordedBlob;
  const canSubmit = Boolean(activeAudio) && !isUploading && !isRecording;

  useEffect(() => {
    void loadSessions();
    const interval = window.setInterval(() => {
      void loadSessions();
    }, 5000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isRecording) {
      return;
    }
    const interval = window.setInterval(() => setRecordSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [recordedUrl]);

  async function loadSessions() {
    setIsLoadingSessions(true);
    try {
      const payload = await apiFetch<SessionsResponse>(session, "/api/sessions");
      setSessions(payload.sessions);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load sessions.");
    } finally {
      setIsLoadingSessions(false);
    }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
    setError(null);
    setStatusMessage(nextFile ? `${nextFile.name} is ready.` : null);
  }

  async function startRecording() {
    setError(null);
    setStatusMessage(null);
    setRecordedBlob(null);
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setRecordedBlob(blob);
        setRecordedUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setStatusMessage("Recording is ready to upload.");
      };

      setRecordSeconds(0);
      recorder.start();
      setIsRecording(true);
    } catch {
      setError("Microphone access was blocked. Allow microphone access or upload an audio file.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }

  async function submitAudio() {
    if (!activeAudio) {
      return;
    }

    setIsUploading(true);
    setError(null);
    setStatusMessage("Uploading audio...");

    const formData = new FormData();
    const uploadTitle = title.trim() || defaultTitle();
    const uploadFile =
      mode === "upload" && file
        ? file
        : new File([activeAudio], `${uploadTitle.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.webm`, { type: activeAudio.type || "audio/webm" });

    formData.set("audio", uploadFile);
    formData.set("title", uploadTitle);
    formData.set("source_type", sourceType);

    try {
      const payload = await apiFetch<UploadResponse>(session, "/api/sessions/upload", {
        method: "POST",
        body: formData
      });
      setStatusMessage("Audio submitted. Processing has started.");
      await loadSessions();
      router.push(`/app/sessions/${payload.session_id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Upload failed.");
      setStatusMessage(null);
    } finally {
      setIsUploading(false);
    }
  }

  const selectedFileLabel = useMemo(() => {
    if (mode === "upload") {
      return file ? file.name : "No file selected";
    }
    return recordedBlob ? `Recorded audio - ${formatTimer(recordSeconds)}` : "No recording yet";
  }, [file, mode, recordedBlob, recordSeconds]);

  const completedSessions = sessions.filter((item) => item.status === "completed");
  const activeSessions = sessions.filter((item) => item.status !== "completed").slice(0, 3);
  const meaningfulSessions = (completedSessions.length > 0 ? completedSessions : sessions).slice(0, 3);
  const attentionItems = [
    ...activeSessions.map((item) => ({
      title: item.title,
      meta: `${item.status.replaceAll("_", " ")} - ${item.source_type}`,
      href: `/app/sessions/${item.id}`
    })),
    ...completedSessions.slice(0, Math.max(0, 3 - activeSessions.length)).map((item) => ({
      title: item.title,
      meta: item.summary ? item.summary : `${item.source_type} conversation is ready to review.`,
      href: `/app/sessions/${item.id}`
    }))
  ].slice(0, 3);

  const fallbackAttention = [
    {
      title: "Follow up with Rahul",
      meta: "Internship opportunity discussed - Tomorrow - 4:00 PM",
      href: "/home"
    },
    {
      title: "You mentioned AI infrastructure",
      meta: "4 times this week.",
      href: "/home"
    },
    {
      title: "2 conversations contain unresolved opportunities.",
      meta: "Review before they fade.",
      href: "/home"
    }
  ];

  const visibleAttention = attentionItems.length > 0 ? attentionItems : fallbackAttention;

  return (
    <main className="home-surface">
      <section className="memory-entry-card" aria-labelledby="capture-title">
        <div className="home-ambient" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p className="home-kicker">Memory entry point</p>
        <h1 id="capture-title">Start a conversation memory</h1>
        <p className="home-entry-copy">Capture what happened. Resona will compress it into priorities, memory, and action.</p>

        <div className="home-capture-actions" role="tablist" aria-label="Capture mode">
          <button className="home-action-button" type="button" data-active={mode === "record"} onClick={() => setMode("record")}>
            <Mic size={18} aria-hidden="true" />
            Record Conversation
          </button>
          <button className="home-action-button" type="button" data-active={mode === "upload"} onClick={() => setMode("upload")}>
            <Upload size={18} aria-hidden="true" />
            Upload Recording
          </button>
        </div>

        <div className="home-capture-body">
          {mode === "upload" ? (
            <label className="home-dropzone">
              <Upload size={22} aria-hidden="true" />
              <strong>{selectedFileLabel}</strong>
              <span>MP3, WAV, M4A, OGG, or WebM audio.</span>
              <input className="sr-only" type="file" accept="audio/*" onChange={onFileChange} />
            </label>
          ) : (
            <div className="home-record-stage">
              <div className="home-record-time">{formatTimer(recordSeconds)}</div>
              <div className="home-record-state">{isRecording ? "Recording..." : selectedFileLabel}</div>
              {isRecording ? (
                <button className="home-submit-button home-danger-button" type="button" onClick={stopRecording}>
                  <Square size={16} aria-hidden="true" />
                  Stop recording
                </button>
              ) : (
                <button className="home-submit-button" type="button" onClick={startRecording}>
                  <Mic size={16} aria-hidden="true" />
                  Start recording
                </button>
              )}
              {recordedUrl ? (
                <audio className="home-audio-preview" src={recordedUrl} controls>
                  <track kind="captions" />
                </audio>
              ) : null}
            </div>
          )}

          <div className="home-capture-fields">
            <label className="field">
              <span className="label">Memory title</span>
              <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder={defaultTitle()} />
            </label>
            <label className="field">
              <span className="label">Conversation type</span>
              <select className="select" value={sourceType} onChange={(event) => setSourceType(event.target.value as typeof sourceType)}>
                {sourceTypes.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error ? (
            <div className="notice notice-error" role="alert">
              {error}
            </div>
          ) : null}

          {statusMessage ? (
            <div className="notice" role="status" aria-live="polite">
              {statusMessage}
            </div>
          ) : null}

          <button className="home-submit-button home-upload-submit" type="button" onClick={submitAudio} disabled={!canSubmit}>
            {isUploading ? <RefreshCw size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
            {isUploading ? "Uploading..." : "Submit audio"}
          </button>
        </div>
      </section>

      <section className="attention-section" aria-labelledby="attention-title">
        <div className="home-section-heading">
          <p className="home-kicker">What matters now</p>
          <h2 id="attention-title">What deserves your attention</h2>
        </div>
        <div className="attention-stack">
          {visibleAttention.map((item, index) => (
            <Link className="attention-card" href={item.href} key={`${item.title}-${index}`}>
              <span className="attention-index">0{index + 1}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.meta}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="important-conversations" aria-labelledby="important-title">
        <div className="home-section-heading">
          <p className="home-kicker">{isLoadingSessions ? "Refreshing memory" : "Important conversations"}</p>
          <h2 id="important-title">Meaningful, actionable, unresolved.</h2>
        </div>
        <div className="conversation-card-grid">
          {meaningfulSessions.length === 0 ? (
            <article className="conversation-card">
              <p>First memory</p>
              <h3>AI Builders Meetup</h3>
              <span>Rahul Sharma</span>
              <span>Internship discussion</span>
              <span>3 action items</span>
              <span>1 unresolved opportunity</span>
            </article>
          ) : (
            meaningfulSessions.map((item) => (
              <Link className="conversation-card" key={item.id} href={`/app/sessions/${item.id}`}>
                <p>{new Date(item.created_at).toLocaleDateString()}</p>
                <h3>{item.title}</h3>
                <span>{item.source_type}</span>
                <span>{item.summary ?? "Memory is still compressing."}</span>
                <StatusChip status={item.status} />
              </Link>
            ))
          )}
        </div>
      </section>

      <section className="memory-signals-section" aria-labelledby="signals-title">
        <div className="home-section-heading">
          <p className="home-kicker">Memory signals</p>
          <h2 id="signals-title">Patterns you should not have to hold yourself.</h2>
        </div>
        <div className="memory-signal-list">
          <span>You&apos;ve discussed startup hiring in 3 separate conversations.</span>
          <span>2 people recently mentioned AI infrastructure roles.</span>
          <span>You tend to postpone follow-ups after networking events.</span>
        </div>
      </section>

      <section className="continuity-section" aria-labelledby="continuity-title">
        <div className="home-section-heading">
          <p className="home-kicker">Continuity layer</p>
          <h2 id="continuity-title">Recently resurfaced</h2>
        </div>
        <article className="resurfaced-card">
          <span className="resurfaced-thread" aria-hidden="true" />
          <h3>Conversation with Aryan resurfaced</h3>
          <p>because Rahul mentioned the same startup.</p>
        </article>
      </section>
    </main>
  );
}
