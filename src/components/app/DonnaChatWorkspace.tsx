"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { ArrowUp, FileAudio, FilePlus2, MessageCircle, Plus, Sparkles, X } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { chatTemplateSchema, donnaChatTemplates, donnaReferenceSkills, type ChatTemplateId } from "@/lib/chat/prompt";

type Thread = { id: string; title: string; plan: string; updated_at: string };
type Message = { id: string; role: "user" | "assistant"; content: string; references_json: unknown[]; created_at: string };
type Reference = { type: "conversation" | "skill" | "file"; id: string; label: string; content?: string };
type Conversation = { id: string; title: string; summary: string | null; status: string };

const MAX_FILE_BYTES = 25_000;
const MAX_FILE_CHARACTERS = 25_000;
const MAX_FILE_COUNT = 4;
const MAX_TOTAL_FILE_CHARACTERS = 50_000;
const ACCEPTED_FILE_EXTENSIONS = [".txt", ".md", ".csv", ".json", ".log"];
const skillReferences: Reference[] = donnaReferenceSkills.map(({ id, label }) => ({ type: "skill", id, label }));

export function DonnaChatWorkspace({ session }: { session: Session }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [references, setReferences] = useState<Reference[]>([]);
  const [template, setTemplate] = useState<ChatTemplateId>("freeform");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

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
      .then((data) => {
        setMessages(data.messages);
        setError(null);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Could not load this chat."))
      .finally(() => setIsLoading(false));
  }, [session, threadId]);

  const activeThread = threads.find((thread) => thread.id === threadId);
  const referenceOptions = useMemo(() => [
    ...conversations.map((conversation) => ({ type: "conversation" as const, id: conversation.id, label: conversation.title })),
    ...skillReferences
  ], [conversations]);
  const selectedFileCharacters = references.reduce((total, reference) => total + (reference.content?.length ?? 0), 0);

  function toggleReference(reference: Reference) {
    const exists = references.some((item) => item.id === reference.id && item.type === reference.type);
    if (exists) {
      setReferences((current) => current.filter((item) => !(item.id === reference.id && item.type === reference.type)));
      return;
    }
    if (references.length >= 12) {
      setError("Choose no more than twelve context references for one message.");
      return;
    }
    if (reference.type === "conversation" && references.filter((item) => item.type === "conversation").length >= 8) {
      setError("Select no more than eight conversations for one message.");
      return;
    }
    setReferences((current) => [...current, reference]);
  }

  async function addFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (references.filter((reference) => reference.type === "file").length + files.length > MAX_FILE_COUNT) {
      setError(`Attach up to ${MAX_FILE_COUNT} reference files per message.`);
      return;
    }
    if (references.length + files.length > 12) {
      setError("Choose no more than twelve context references for one message.");
      return;
    }
    try {
      const loaded: Reference[] = [];
      for (const file of files) {
        const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
        if (!ACCEPTED_FILE_EXTENSIONS.includes(extension)) {
          throw new Error(`${file.name} is not a supported text file. Choose TXT, Markdown, CSV, JSON, or LOG.`);
        }
        if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name} is larger than 25 KB.`);
        const content = await file.text();
        if (!content.trim()) throw new Error(`${file.name} is empty.`);
        if (content.length > MAX_FILE_CHARACTERS) throw new Error(`${file.name} contains more than 25,000 characters.`);
        loaded.push({ type: "file", id: crypto.randomUUID(), label: file.name, content });
      }
      if (selectedFileCharacters + loaded.reduce((total, file) => total + (file.content?.length ?? 0), 0) > MAX_TOTAL_FILE_CHARACTERS) {
        throw new Error("Reference files must total 50,000 characters or less.");
      }
      setReferences((current) => [...current, ...loaded]);
      setError(null);
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : "Could not read that reference file.");
    }
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
      const data = await apiFetch<{ messages: Message[] }>(session, `/api/chat/threads/${threadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: input, references, template })
      });
      setMessages((current) => [...current, ...data.messages]);
      setInput("");
      setReferences([]);
      setTemplate("freeform");
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
        <p className="donna-plan-note">{threads.length} of 2 chats</p>
        <div className="donna-thread-list">
          {threads.map((thread) => <button className="donna-thread" data-active={thread.id === threadId} type="button" key={thread.id} onClick={() => { setThreadId(thread.id); setReferences([]); setTemplate("freeform"); setError(null); }}><MessageCircle size={16} /><span>{thread.title}</span></button>)}
        </div>
        <div className="donna-sidebar-footer"><Link href="/capture"><FileAudio size={15} /> Record a meeting</Link><span>Your conversations stay private.</span></div>
      </aside>
      <section className="donna-chat" aria-labelledby="donna-chat-title">
        <header className="donna-chat-header"><div><p className="home-kicker">Meeting workspace</p><h2 id="donna-chat-title">{activeThread?.title ?? "New chat"}</h2></div></header>
        <div className="donna-message-scroll">
          {isLoading && !error ? <div className="donna-empty"><span className="donna-empty-index">LOADING</span><h3>Loading chat…</h3></div> : error && messages.length === 0 ? <div className="donna-empty donna-empty-error"><span className="donna-empty-index">WORKSPACE ERROR</span><h3>Donna could not open this chat.</h3><p>{error}</p></div> : messages.length === 0 ? <div className="donna-empty"><span className="donna-empty-index">START HERE</span><Sparkles size={22} /><h3>What should Donna help with?</h3><p>Select a conversation or reference file to ground your question, or start with a general brainstorm.</p><div className="donna-suggestions"><button type="button" onClick={() => { setTemplate("follow-up"); setInput("Help me draft a follow-up."); }}>Draft a follow-up</button><button type="button" onClick={() => { setTemplate("brainstorm"); setInput("Brainstorm practical next steps."); }}>Brainstorm next steps</button></div></div> : messages.map((message) => <article className={`donna-message donna-message-${message.role}`} key={message.id}><span className="donna-message-role">{message.role === "user" ? "You" : "Donna"}</span><p>{message.content}</p></article>)}
        </div>
        {error && !isLoading && messages.length > 0 ? <div className="donna-error" role="alert">{error}</div> : null}
        <div className="donna-composer-wrap">
          {references.length > 0 ? <div className="donna-reference-row">{references.map((reference) => <button type="button" key={`${reference.type}-${reference.id}`} onClick={() => toggleReference(reference)} aria-label={`Remove ${reference.label}`}>@{reference.label} <X size={12} /></button>)}</div> : null}
          <form className="donna-composer" onSubmit={sendMessage}><textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="Message Donna…" rows={2} aria-label="Message Donna" /><button type="submit" className="donna-send-button" disabled={isSending || !input.trim()} aria-label="Send message"><ArrowUp size={18} /></button></form>
          <div className="donna-composer-tools">
            <label className="donna-template-control">Template
              <select value={template} onChange={(event) => setTemplate(chatTemplateSchema.parse(event.target.value))} aria-label="Chat response template">
                {donnaChatTemplates.map((item) => <option key={item.id} value={item.id} title={item.description}>{item.label}</option>)}
              </select>
            </label>
            <div className="donna-reference-picker"><span>Add context</span>{referenceOptions.map((reference) => <button type="button" key={`${reference.type}-${reference.id}`} data-selected={references.some((item) => item.id === reference.id && item.type === reference.type)} onClick={() => toggleReference(reference)} title={reference.type === "conversation" ? conversations.find((item) => item.id === reference.id)?.summary ?? undefined : undefined}>@{reference.label}</button>)}
              <button type="button" onClick={() => fileInput.current?.click()}><FilePlus2 size={13} /> Add file</button>
              <input ref={fileInput} className="donna-file-input" type="file" accept=".txt,.md,.csv,.json,.log,text/plain,text/markdown,text/csv,application/json" multiple onChange={(event) => void addFiles(event)} aria-label="Add reference files" />
            </div>
          </div>
          {error && !isLoading && messages.length === 0 ? <div className="donna-error" role="alert">{error}</div> : null}
          <p className="donna-file-note">Text references only (TXT, MD, CSV, JSON, LOG); files are used for this message and not stored.</p>
        </div>
      </section>
    </main>
  );
}
