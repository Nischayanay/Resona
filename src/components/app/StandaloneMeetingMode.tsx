"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Download, Copy, Check } from "lucide-react";

function timer(seconds: number) {
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export function StandaloneMeetingMode() {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!recording) return;
    const id = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [recording]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (event) => event.data.size && chunksRef.current.push(event.data);
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      setAudioUrl(URL.createObjectURL(blob));
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
    recorderRef.current = recorder;
    recorder.start();

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-IN";
      recognition.onresult = (event: any) => {
        let value = "";
        for (let index = 0; index < event.results.length; index += 1) value += `${event.results[index][0].transcript} `;
        setTranscript(value.trim());
      };
      recognition.onend = () => {
        if (recorderRef.current?.state === "recording") try { recognition.start(); } catch { /* already active */ }
      };
      recognitionRef.current = recognition;
      recognition.start();
      setSupported(true);
    } else setSupported(false);
    setSeconds(0);
    setRecording(true);
  }

  function stop() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }

  async function copyTranscript() {
    await navigator.clipboard.writeText(transcript || "No live transcript captured.");
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <main className="standalone-meeting" aria-labelledby="meeting-title">
      <p className="home-kicker">Vynora / Meeting mode</p>
      <h1 id="meeting-title">Capture the conversation.</h1>
      <p className="standalone-meeting-intro">Keep this tab open during your meeting. Resona records your microphone locally in the browser and shows live words when your browser supports speech recognition.</p>
      <div className="standalone-meeting-timer" aria-live="polite">{timer(seconds)}</div>
      <div className="standalone-meeting-actions">
        {!recording ? <button className="button button-primary" type="button" onClick={() => void start()}><Mic size={17} /> Start meeting capture</button> : <button className="button home-danger-button" type="button" onClick={stop}><Square size={17} /> Stop capture</button>}
        {audioUrl ? <a className="button button-secondary" href={audioUrl} download="vynora-meeting.webm"><Download size={17} /> Download audio</a> : null}
        {transcript ? <button className="button button-secondary" type="button" onClick={() => void copyTranscript()}>{copied ? <Check size={17} /> : <Copy size={17} />} {copied ? "Copied" : "Copy transcript"}</button> : null}
      </div>
      <section className="standalone-meeting-transcript" aria-live="polite">
        <div className="home-panel-heading"><p className="home-kicker">{supported === false ? "Audio only" : "Live transcript"}</p><h2>{recording ? "Listening" : "Your meeting notes"}</h2></div>
        <p>{transcript || (supported === false ? "Your browser does not expose speech recognition. The audio recording still works; download it after the meeting." : "Start capture and keep this page open. Live speech will appear here.")}</p>
      </section>
      <p className="standalone-meeting-warning">Tell everyone you are recording and follow the consent rules for your location and meeting platform.</p>
    </main>
  );
}
