"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { ArrowUp, FileAudio, MessageCircle, Plus, Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

type Thread = { id: string; title: string; plan: string; updated_at: string };
type Message = { id: string; role: "user" | "assistant"; content: string; references_json: unknown[]; created_at: string };
type Reference = { type: string; id: string; label: string };
type Conversation = { id: string; title: string; summary: string | null; status: string };

const skillReferences: Reference[] = [
  { type: "skill", id: "follow-up", label: "Follow-up skill" },
  { type: "skill", id: "meeting-brief", label: "Meeting brief skill" },
  { type: "skill", id: "decision-log", label: "Decision log skill" }
];

export function DonnaChatWorkspace({ session }: { session: Session }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [references, setReferences] = useState<Reference[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadThreads = useCallback(async () => {
    const data = await apiFetch<{ threads: Thread[] }>(session, "/api/chat/threads");
    setThreads(data.threads);
    if (!threadId && data.threads[0]) setThreadId(data.threads[0].id);
    if (!data.threads[0]) {
      const created = await apiFetch<{ thread: Thread }>(session, "/api/chat/threads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      setThreads([created.thread]);
      setThreadId(created.thread.id);
    }
  }, [session, threadId]);

  useEffect(() => {
    void Promise.all([
      loadThreads(),
      apiFetch<{ sessions: Conversation[] }>(session, "/api/sessions").then((data) => setConversations(data.sessions.slice(0, 12)))
  ]).catch((loadError) => {
    setError(loadError instanceof Error ? loadError.message : "Donna could not open your workspace.");
    setIsLoading(false);
  });
  }, [loadThreads, session]);

  useEffect(() => {
    if (!threadId) return;
    setIsLoading(true);
    void apiFetch<{ messages: Message[] }>(session, `/api/chat/threads/${threadId}/messages`)
      .then((data) => setMessages(data.messages))
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Could not load this chat."))
      .finally(() => setIsLoading(false));
  }, [session, threadId]);

  const activeThread = threads.find((thread) => thread.id === threadId);
  const referenceOptions = useMemo(() => [
    ...conversations.map((conversation) => ({ type: "conversation", id: conversation.id, label: conversation.title })),
    ...skillReferences
  ], [conversations]);

  function toggleReference(reference: Reference) {
    setReferences((current) => current.some((item) => item.id === reference.id && item.type === reference.type) ? current.filter((item) => !(item.id === reference.id && item.type === reference.type)) : [...current, reference]);
  }

  async function createThread() {
    try {
      const data = await apiFetch<{ thread: Thread }>(session, "/api/chat/threads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      setThreads((current) => [data.thread, ...current]);
      setThreadId(data.thread.id);
      setMessages([]);
      setError(null);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create another chat.");
    }
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!threadId || !input.trim() || isSending) return;
    setIsSending(true);
    setError(null);
    try {
      const data = await apiFetch<{ messages: Message[] }>(session, `/api/chat/threads/${threadId}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: input, references }) });
      setMessages((current) => [...current, ...data.messages]);
      setInput("");
      setReferences([]);
      await loadThreads();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Donna could not answer right now.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="donna-workspace">
      <aside className="donna-sidebar" aria-label="Donna chats">
        <div className="donna-sidebar-heading"><div><p className="home-kicker">Donna</p><h1>Chats</h1></div><button className="donna-icon-button" type="button" onClick={() => void createThread()} aria-label="New chat" disabled={threads.length >= 2}><Plus size={17} /></button></div>
        <p className="donna-plan-note">Free plan · {threads.length} of 2 chats used</p>
        <div className="donna-thread-list">
          {threads.map((thread) => <button className="donna-thread" data-active={thread.id === threadId} type="button" key={thread.id} onClick={() => setThreadId(thread.id)}><MessageCircle size={16} /><span>{thread.title}</span></button>)}
        </div>
        <div className="donna-sidebar-footer"><Link href="/meeting"><FileAudio size={15} /> Capture a meeting</Link><span>Your conversations stay private.</span></div>
      </aside>
      <section className="donna-chat" aria-labelledby="donna-chat-title">
        <header className="donna-chat-header"><div><p className="home-kicker">Continuous workspace</p><h2 id="donna-chat-title">{activeThread?.title ?? "New chat"}</h2></div><span className="donna-status"><i /> Donna is ready</span></header>
        <div className="donna-message-scroll">
          {isLoading && !error ? <div className="donna-empty"><span className="donna-empty-index">01 / OPEN THREAD</span><h3>Bring a thread back.</h3><p>Donna keeps the people, promises, decisions, and next moves from your conversations close at hand.</p></div> : error ? <div className="donna-empty donna-empty-error"><span className="donna-empty-index">02 / SETUP REQUIRED</span><h3>Donna is not connected yet.</h3><p>{error}</p><p className="donna-empty-help">Apply the Donna chat migration in Supabase, then refresh this workspace.</p></div> : messages.length === 0 ? <div className="donna-empty"><span className="donna-empty-index">01 / START HERE</span><Sparkles size={22} /><h3>What should Donna bring back?</h3><p>Ask about a past conversation, a promise, a person, or the next move.</p><div className="donna-suggestions"><button type="button" onClick={() => setInput("What did I promise this client?")}>What did I promise this client?</button><button type="button" onClick={() => setInput("Prepare me for my next meeting.")}>Prepare me for my next meeting.</button></div></div> : messages.map((message) => <article className={`donna-message donna-message-${message.role}`} key={message.id}><span className="donna-message-role">{message.role === "user" ? "You" : "Donna"}</span><p>{message.content}</p></article>)}
        </div>
        {error && !isLoading ? <div className="donna-error" role="alert">Chat setup is incomplete. Your conversation data is safe.</div> : null}
        <div className="donna-composer-wrap">
          {references.length > 0 ? <div className="donna-reference-row">{references.map((reference) => <button type="button" key={`${reference.type}-${reference.id}`} onClick={() => toggleReference(reference)}>@{reference.label} ×</button>)}</div> : null}
          <form className="donna-composer" onSubmit={sendMessage}><textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="Message Donna… Use @ to add context" rows={2} /><button type="submit" className="donna-send-button" disabled={isSending || !input.trim()} aria-label="Send message"><ArrowUp size={18} /></button></form>
          <div className="donna-reference-picker"><span>Add context</span>{referenceOptions.slice(0, 6).map((reference) => <button type="button" key={`${reference.type}-${reference.id}`} data-selected={references.some((item) => item.id === reference.id && item.type === reference.type)} onClick={() => toggleReference(reference)}>@{reference.label}</button>)}</div>
        </div>
      </section>
    </main>
  );
}
