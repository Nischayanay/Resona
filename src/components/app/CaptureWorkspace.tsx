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

  return (
    <main className="app-main">
      <div className="workspace-grid">
        <section className="panel" aria-labelledby="capture-title">
          <div className="panel-header">
            <div>
              <h1 id="capture-title" className="panel-title">
                Capture a conversation
              </h1>
              <p className="panel-copy">Record now or upload audio from a meeting, lecture, event, or quick follow-up.</p>
            </div>
          </div>

          <div className="panel-body">
            <div className="capture-tabs" role="tablist" aria-label="Capture mode">
              <button className="tab-button" type="button" data-active={mode === "record"} onClick={() => setMode("record")}>
                Record
              </button>
              <button className="tab-button" type="button" data-active={mode === "upload"} onClick={() => setMode("upload")}>
                Upload
              </button>
            </div>

            {mode === "upload" ? (
              <label className="dropzone">
                <Upload size={26} aria-hidden="true" />
                <strong>{selectedFileLabel}</strong>
                <span>Choose MP3, WAV, M4A, OGG, or WebM audio.</span>
                <input className="sr-only" type="file" accept="audio/*" onChange={onFileChange} />
              </label>
            ) : (
              <div className="record-stage">
                <div>
                  <div className="record-time">{formatTimer(recordSeconds)}</div>
                  <div className="record-state">{isRecording ? "Recording..." : selectedFileLabel}</div>
                  <div className="button-row" style={{ justifyContent: "center", marginTop: 18 }}>
                    {isRecording ? (
                      <button className="button button-danger" type="button" onClick={stopRecording}>
                        <Square size={16} aria-hidden="true" />
                        Stop
                      </button>
                    ) : (
                      <button className="button button-primary" type="button" onClick={startRecording}>
                        <Mic size={16} aria-hidden="true" />
                        Start recording
                      </button>
                    )}
                  </div>
                  {recordedUrl ? (
                    <audio style={{ marginTop: 16, width: "100%" }} src={recordedUrl} controls>
                      <track kind="captions" />
                    </audio>
                  ) : null}
                </div>
              </div>
            )}

            <div className="form-stack">
              <label className="field">
                <span className="label">Title</span>
                <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder={defaultTitle()} />
              </label>

              <label className="field">
                <span className="label">Source type</span>
                <select className="select" value={sourceType} onChange={(event) => setSourceType(event.target.value as typeof sourceType)}>
                  {sourceTypes.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </label>

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

              <button className="button button-primary" type="button" onClick={submitAudio} disabled={!canSubmit}>
                {isUploading ? (
                  <>
                    <RefreshCw size={16} aria-hidden="true" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Play size={16} aria-hidden="true" />
                    Submit audio
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        <section className="panel" aria-labelledby="sessions-title">
          <div className="panel-header">
            <div>
              <h2 id="sessions-title" className="panel-title">
                Recent sessions
              </h2>
              <p className="panel-copy">{isLoadingSessions ? "Refreshing..." : "Processing updates appear automatically."}</p>
            </div>
            <button className="button button-secondary" type="button" onClick={() => void loadSessions()}>
              <RefreshCw size={16} aria-hidden="true" />
              Refresh
            </button>
          </div>
          <div className="panel-body">
            {sessions.length === 0 ? (
              <div className="empty-state">No sessions yet. Record or upload your first conversation.</div>
            ) : (
              <div className="session-list">
                {sessions.map((item) => (
                  <Link className="session-row" key={item.id} href={`/app/sessions/${item.id}`}>
                    <div className="button-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                      <h3 className="session-row-title">{item.title}</h3>
                      <StatusChip status={item.status} />
                    </div>
                    <div className="session-row-meta">
                      {item.source_type} · {new Date(item.created_at).toLocaleString()}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
