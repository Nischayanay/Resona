"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  Archive,
  ArrowDown,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  DatabaseZap,
  FileAudio,
  LockKeyhole,
  Mic,
  Play,
  RefreshCw,
  ShieldCheck,
  Square,
  Upload
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { apiFetch } from "@/lib/api-client";
import { BETA_FILE_SIZE_MESSAGE, BETA_MAX_AUDIO_BYTES, BETA_MAX_AUDIO_SECONDS, BETA_SUPPORT_URL } from "@/lib/beta-limits";
import type { ToolAction, VynoraSession } from "@/components/app/types";

type UploadResponse = {
  session_id: string;
  status: string;
};

type ToolActionsResponse = {
  tool_actions: ToolAction[];
};

type SessionsResponse = {
  sessions: VynoraSession[];
};

type HomeTab = "capture" | "moves" | "memory" | "control";
type SourceType = (typeof sourceTypes)[number];

const sourceTypes = ["meeting", "event", "lecture", "casual", "mentorship", "other"] as const;

const tabs: { id: HomeTab; label: string; eyebrow: string }[] = [
  { id: "capture", label: "Capture", eyebrow: "Start" },
  { id: "moves", label: "Next Moves", eyebrow: "Approve" },
  { id: "memory", label: "Memory", eyebrow: "Return" },
  { id: "control", label: "Control", eyebrow: "Trust" }
];

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

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function statusCopy(status: VynoraSession["status"]) {
  const labels: Record<VynoraSession["status"], string> = {
    uploaded: "Uploaded",
    queued: "Queued",
    transcribing: "Listening",
    extracting: "Noticing",
    normalizing: "Organizing",
    prioritizing: "Prioritizing",
    linking_memory: "Linking",
    suggesting_tools: "Suggesting",
    completed: "Remembered",
    failed: "Needs review",
    partial_failed: "Partial"
  };
  return labels[status] ?? status.replaceAll("_", " ");
}

function getAudioDurationSeconds(file: Blob) {
  return new Promise<number | null>((resolve) => {
    const audio = document.createElement("audio");
    const url = URL.createObjectURL(file);
    const cleanup = () => {
      URL.revokeObjectURL(url);
      audio.remove();
    };
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : null;
      cleanup();
      resolve(duration);
    };
    audio.onerror = () => {
      cleanup();
      resolve(null);
    };
    audio.src = url;
  });
}

export function CaptureWorkspace({ session }: { session: Session }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<HomeTab>("capture");
  const [mode, setMode] = useState<"record" | "upload">("record");
  const [title, setTitle] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("meeting");
  const [file, setFile] = useState<File | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [actionsError, setActionsError] = useState<string | null>(null);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [toolActions, setToolActions] = useState<ToolAction[]>([]);
  const [recentSessions, setRecentSessions] = useState<VynoraSession[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingActions, setIsLoadingActions] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const activeAudio = mode === "upload" ? file : recordedBlob;
  const canSubmit = Boolean(activeAudio) && !isUploading && !isRecording;
  const actionables = toolActions.slice(0, 4);
  const visibleSessions = recentSessions.slice(0, 5);
  const rememberedCount = recentSessions.filter((item) => item.status === "completed").length;

  useEffect(() => {
    void loadActionables();
    void loadRecentSessions();
    const interval = window.setInterval(() => {
      void loadActionables();
      void loadRecentSessions();
    }, 8000);
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
    if (isRecording && recordSeconds >= BETA_MAX_AUDIO_SECONDS) {
      stopRecording();
      setStatusMessage("Recording stopped at the 2 minute demo limit.");
    }
  }, [isRecording, recordSeconds]);

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
      setActionsError(null);
    } catch (loadError) {
      setActionsError(loadError instanceof Error ? loadError.message : "Could not load next moves.");
    } finally {
      setIsLoadingActions(false);
    }
  }

  async function loadRecentSessions() {
    setIsLoadingSessions(true);
    try {
      const payload = await apiFetch<SessionsResponse>(session, "/api/sessions");
      setRecentSessions(payload.sessions);
      setSessionsError(null);
    } catch (loadError) {
      setSessionsError(loadError instanceof Error ? loadError.message : "Could not load remembered conversations.");
    } finally {
      setIsLoadingSessions(false);
    }
  }

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setCaptureError(null);
    setStatusMessage(null);

    if (!nextFile) {
      setFile(null);
      return;
    }
    if (nextFile.size > BETA_MAX_AUDIO_BYTES) {
      setFile(null);
      event.target.value = "";
      setCaptureError(BETA_FILE_SIZE_MESSAGE);
      return;
    }

    const duration = await getAudioDurationSeconds(nextFile);
    if (duration === null) {
      setFile(null);
      event.target.value = "";
      setCaptureError("Audio duration could not be verified. Please upload audio that is 2 minutes or less.");
      return;
    }
    if (duration !== null && duration > BETA_MAX_AUDIO_SECONDS) {
      setFile(null);
      event.target.value = "";
      setCaptureError("Audio must be 2 minutes or less.");
      return;
    }

    setFile(nextFile);
    setStatusMessage(`${nextFile.name} is ready.`);
  }

  async function startRecording() {
    setCaptureError(null);
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
      setCaptureError("Microphone access was blocked. Allow microphone access or upload an audio file.");
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
    setCaptureError(null);
    setStatusMessage("Uploading audio...");

    const formData = new FormData();
    const uploadTitle = title.trim() || defaultTitle();
    const uploadFile =
      mode === "upload" && file
        ? file
        : new File([activeAudio], `${uploadTitle.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.webm`, { type: activeAudio.type || "audio/webm" });

    if (uploadFile.size > BETA_MAX_AUDIO_BYTES) {
      setCaptureError(BETA_FILE_SIZE_MESSAGE);
      setStatusMessage(null);
      setIsUploading(false);
      return;
    }

    const duration = mode === "record" ? recordSeconds : await getAudioDurationSeconds(uploadFile);
    if (duration === null) {
      setCaptureError("Audio duration could not be verified. Please upload audio that is 2 minutes or less.");
      setStatusMessage(null);
      setIsUploading(false);
      return;
    }
    if (duration !== null && duration > BETA_MAX_AUDIO_SECONDS) {
      setCaptureError("Audio must be 2 minutes or less.");
      setStatusMessage(null);
      setIsUploading(false);
      return;
    }

    formData.set("audio", uploadFile);
    formData.set("title", uploadTitle);
    formData.set("source_type", sourceType);
    formData.set("duration_seconds", String(Math.ceil(duration)));

    try {
      const payload = await apiFetch<UploadResponse>(session, "/api/sessions/upload", {
        method: "POST",
        body: formData
      });
      setStatusMessage("Audio submitted. Processing has started.");
      await Promise.all([loadActionables(), loadRecentSessions()]);
      router.push(`/conversations/${payload.session_id}`);
    } catch (submitError) {
      const typedError = submitError as Error & { code?: string };
      const message = submitError instanceof Error ? submitError.message : "Upload failed.";
      setCaptureError(message);
      setStatusMessage(null);
      if (typedError.code === "UPLOAD_LIMIT_REACHED") {
        window.setTimeout(() => {
          window.location.assign(BETA_SUPPORT_URL);
        }, 1800);
      }
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
    <main className="home-command-surface">
      <div className="home-issue-bar" aria-label="Vynora home status">
        <span>VY / HOME</span>
        <span>MEMORY DESK</span>
        <span>
          <CircleDot size={12} aria-hidden="true" />
          LIVE
        </span>
      </div>

      <section className="home-command-hero" aria-labelledby="home-command-title">
        <div className="home-command-copy">
          <Badge>Private conversation memory</Badge>
          <h1 id="home-command-title">
            Bring the right <em>conversation</em> back.
          </h1>
          <p>Record, upload, or return to the promises Vynora already noticed.</p>
          <div className="home-hero-actions">
            <Button type="button" onClick={() => setActiveTab("capture")}>
              Start with one conversation
              <ArrowDown size={16} aria-hidden="true" />
            </Button>
            <Button asChild variant="outline">
              <Link href="/conversations">
                Open memory ledger
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
        <div className="home-memory-plate" aria-hidden="true">
          <img src="/brand/vynora-dashboard-art.png" alt="" />
          <span className="plate-corner plate-corner-one" />
          <span className="plate-corner plate-corner-two" />
          <div className="home-plate-menu">
            <span>01 NOTICE</span>
            <span>02 REMEMBER</span>
            <span>03 RETURN</span>
            <span>04 APPROVE</span>
          </div>
        </div>
      </section>

      <div className="home-editorial-tabs" role="tablist" aria-label="Dashboard views">
        {tabs.map((tab, index) => (
          <button
            aria-controls="home-tab-panel"
            aria-selected={activeTab === tab.id}
            className="home-editorial-tab"
            data-active={activeTab === tab.id}
            id={`home-tab-${tab.id}`}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            type="button"
          >
            <span>0{index + 1}</span>
            <strong>{tab.label}</strong>
            <small>{tab.eyebrow}</small>
          </button>
        ))}
      </div>

      <section className="home-tab-panel" id="home-tab-panel" role="tabpanel" aria-labelledby={`home-tab-${activeTab}`}>
        <div className="home-tab-panel-copy">
          <span>{tabs.find((tab) => tab.id === activeTab)?.eyebrow}</span>
          <p>
            {activeTab === "capture" ? "Capture the call before context fades." : null}
            {activeTab === "moves" ? "Only the next move waits here, and nothing happens until you approve it." : null}
            {activeTab === "memory" ? "Recent conversations stay searchable, reviewable, and ready to reopen." : null}
            {activeTab === "control" ? "Settings keeps export, delete, and calendar controls away from the daily flow." : null}
          </p>
        </div>
      </section>

      <div className="home-command-desk">
        <section className="home-panel home-capture-command" aria-labelledby="capture-title">
          <div className="home-panel-heading">
            <p className="home-kicker">Capture</p>
            <h2 id="capture-title">Start with one conversation.</h2>
          </div>

          <div className="home-capture-actions" role="tablist" aria-label="Capture mode">
            <button className="home-action-button" type="button" role="tab" aria-selected={mode === "record"} data-active={mode === "record"} onClick={() => setMode("record")}>
              <Mic size={18} aria-hidden="true" />
              Record
            </button>
            <button className="home-action-button" type="button" role="tab" aria-selected={mode === "upload"} data-active={mode === "upload"} onClick={() => setMode("upload")}>
              <Upload size={18} aria-hidden="true" />
              Upload
            </button>
          </div>

          <div className="home-capture-body">
            {mode === "upload" ? (
              <label className="home-dropzone">
                <FileAudio size={24} aria-hidden="true" />
                <strong>{selectedFileLabel}</strong>
                <span>MP3, WAV, M4A, OGG, or WebM audio. Two minutes max in beta.</span>
                <input className="sr-only" type="file" accept="audio/*" onChange={onFileChange} />
              </label>
            ) : (
              <div className="home-record-stage" data-recording={isRecording}>
                <div className="home-record-time">{formatTimer(recordSeconds)}</div>
                <div className="home-record-state">{isRecording ? "Recording..." : selectedFileLabel}</div>
                {isRecording ? (
                  <Button className="home-danger-button" type="button" onClick={stopRecording}>
                    <Square size={16} aria-hidden="true" />
                    Stop recording
                  </Button>
                ) : (
                  <Button type="button" onClick={startRecording}>
                    <Mic size={16} aria-hidden="true" />
                    Start recording
                  </Button>
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
                <select className="select" value={sourceType} onChange={(event) => setSourceType(event.target.value as SourceType)}>
                  {sourceTypes.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {captureError ? (
              <div className="notice notice-error" role="alert">
                {captureError}
              </div>
            ) : null}

            {statusMessage ? (
              <div className="notice" role="status" aria-live="polite">
                {statusMessage}
              </div>
            ) : null}

            <Button className="home-upload-submit" type="button" onClick={submitAudio} disabled={!canSubmit}>
              {isUploading ? <RefreshCw size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
              {isUploading ? "Uploading..." : "Submit audio"}
            </Button>
          </div>
        </section>

        <ActionQueue items={actionables} isLoading={isLoadingActions} error={actionsError} />
      </div>

      <RecentMemoryLedger items={visibleSessions} isLoading={isLoadingSessions} error={sessionsError} rememberedCount={rememberedCount} totalCount={recentSessions.length} />

      <ControlStrip userEmail={session.user.email ?? ""} />
    </main>
  );
}

function ActionQueue({ items, isLoading, error }: { items: ToolAction[]; isLoading: boolean; error: string | null }) {
  return (
    <section className="home-panel home-action-queue" aria-labelledby="action-queue-title">
      <div className="home-panel-heading">
        <p className="home-kicker">{isLoading ? "Refreshing" : "Next moves"}</p>
        <h2 id="action-queue-title">Nothing happens until you say yes.</h2>
      </div>

      {error ? (
        <div className="notice notice-error" role="alert">
          {error}
        </div>
      ) : null}

      <div className="home-action-stack">
        {items.length === 0 ? (
          <div className="home-empty-state">
            <CheckCircle2 size={18} aria-hidden="true" />
            <span>No next moves waiting. Capture a conversation and Vynora will surface what needs your approval.</span>
          </div>
        ) : (
          items.map((item, index) => {
            const href = item.session_id ? `/conversations/${item.session_id}` : "/conversations";
            return (
              <Link className="home-action-card" href={href} key={item.id} style={{ "--home-row": index } as React.CSSProperties}>
                <span className="home-action-index">0{index + 1}</span>
                <div>
                  <h3>{item.payload_json.title ?? (item.tool_name === "google_calendar" ? "Review calendar suggestion" : "Review suggested action")}</h3>
                  <p>{item.reason}</p>
                  <span className="home-actionable-meta">
                    {item.tool_name === "google_calendar" ? <CalendarDays size={14} aria-hidden="true" /> : <CheckCircle2 size={14} aria-hidden="true" />}
                    {item.tool_name.replaceAll("_", " ")} / {item.action_type.replaceAll("_", " ")}
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </section>
  );
}

function RecentMemoryLedger({
  items,
  isLoading,
  error,
  rememberedCount,
  totalCount
}: {
  items: VynoraSession[];
  isLoading: boolean;
  error: string | null;
  rememberedCount: number;
  totalCount: number;
}) {
  return (
    <section className="home-memory-ledger" aria-labelledby="memory-ledger-title">
      <div className="home-ledger-heading">
        <div>
          <p className="home-kicker">Memory</p>
          <h2 id="memory-ledger-title">Recent conversations, still close.</h2>
        </div>
        <div className="home-ledger-stats" aria-label="Memory totals">
          <span>{String(totalCount).padStart(2, "0")} total</span>
          <span>{String(rememberedCount).padStart(2, "0")} remembered</span>
        </div>
      </div>

      {error ? (
        <div className="notice notice-error" role="alert">
          {error}
        </div>
      ) : null}

      <div className="home-ledger-list">
        {isLoading && items.length === 0 ? (
          <div className="home-empty-state">
            <RefreshCw size={18} aria-hidden="true" />
            <span>Loading remembered conversations...</span>
          </div>
        ) : null}

        {!isLoading && items.length === 0 ? (
          <div className="home-empty-state">
            <Archive size={18} aria-hidden="true" />
            <span>No remembered conversations yet. Start with one conversation.</span>
          </div>
        ) : null}

        {items.map((item, index) => (
          <Link className="home-ledger-row" href={`/conversations/${item.id}`} key={item.id} style={{ "--home-row": index } as React.CSSProperties}>
            <span className="home-ledger-number">0{index + 1}</span>
            <div className="home-ledger-main">
              <h3>{item.title}</h3>
              <p>{item.summary ?? "Vynora is still arranging what matters from this conversation."}</p>
            </div>
            <div className="home-ledger-meta">
              <span data-status={item.status}>{statusCopy(item.status)}</span>
              <small>{formatShortDate(item.updated_at ?? item.created_at)}</small>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ControlStrip({ userEmail }: { userEmail: string }) {
  return (
    <section className="home-control-strip" aria-labelledby="control-title">
      <div>
        <p className="home-kicker">Control</p>
        <h2 id="control-title">Your memory stays reviewable.</h2>
        <p>Export data, delete stored memory, or connect calendar approval from settings.</p>
      </div>
      <Separator className="home-control-separator" />
      <div className="home-control-actions">
        <span>
          <LockKeyhole size={15} aria-hidden="true" />
          {userEmail}
        </span>
        <span>
          <ShieldCheck size={15} aria-hidden="true" />
          Private by default
        </span>
        <span>
          <DatabaseZap size={15} aria-hidden="true" />
          Exportable
        </span>
        <Button asChild variant="outline">
          <Link href="/settings">
            Open controls
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
