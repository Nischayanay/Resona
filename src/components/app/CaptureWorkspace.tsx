"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { CalendarDays, CheckCircle2, Mic, Play, RefreshCw, Square, Upload } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import type { ToolAction } from "@/components/app/types";

type UploadResponse = {
  session_id: string;
  status: string;
};

type ToolActionsResponse = {
  tool_actions: ToolAction[];
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
  const [toolActions, setToolActions] = useState<ToolAction[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingActions, setIsLoadingActions] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const activeAudio = mode === "upload" ? file : recordedBlob;
  const canSubmit = Boolean(activeAudio) && !isUploading && !isRecording;

  useEffect(() => {
    void loadActionables();
    const interval = window.setInterval(() => {
      void loadActionables();
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

  async function loadActionables() {
    setIsLoadingActions(true);
    try {
      const payload = await apiFetch<ToolActionsResponse>(session, "/api/tool-actions?status=suggested");
      setToolActions(payload.tool_actions);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load actionables.");
    } finally {
      setIsLoadingActions(false);
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
      await loadActionables();
      router.push(`/conversations/${payload.session_id}`);
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

  const actionables = toolActions.slice(0, 4);

  return (
    <main className="home-surface">
      <div className="home-command-grid">
        <section className="memory-entry-card intelligence-surface" aria-labelledby="capture-title">
          <div className="home-ambient ambient-field" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <p className="home-kicker">Memory entry point</p>
          <h1 id="capture-title">Start your memory thread</h1>
          <p className="home-entry-copy editorial-copy">Capture what happened. Resona will compress it into priorities, memory, and action.</p>

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

        <section className="attention-section attention-section-command" aria-labelledby="attention-title">
          <div className="home-section-heading">
            <p className="home-kicker">{isLoadingActions ? "Refreshing actions" : "Actionables"}</p>
            <h2 id="attention-title">Only what needs your next move.</h2>
          </div>
          <div className="attention-stack">
            {actionables.length === 0 ? (
              <div className="empty-state">No pending actions yet. Record or upload a conversation and Resona will surface calendar suggestions, tasks, and follow-ups here.</div>
            ) : (
              actionables.map((item, index) => (
                <Link className={`attention-card ${index === 0 ? "priority-card" : "signal-card"}`} href="/conversations" key={item.id}>
                  <span className="attention-index">0{index + 1}</span>
                  <div>
                    <h3>{item.payload_json.title ?? (item.tool_name === "google_calendar" ? "Review calendar suggestion" : "Review suggested action")}</h3>
                    <p>{item.reason}</p>
                    <span className="home-actionable-meta">
                      {item.tool_name === "google_calendar" ? <CalendarDays size={14} aria-hidden="true" /> : <CheckCircle2 size={14} aria-hidden="true" />}
                      {item.tool_name.replaceAll("_", " ")} · {item.action_type.replaceAll("_", " ")}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>

    </main>
  );
}
