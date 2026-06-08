import { Archive, ArchiveRestore, ArrowUp, History, Paperclip, Pencil, Plus, Trash2, X } from "lucide-react";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { useEffect, useMemo, useRef, useState } from "react";
import { createConversation, deleteConversation, listConversations, listModels, listRuns, loadMessages, sendAssistantMessage, updateConversation, type AssistantMessage, type AssistantRun, type AssistantWidget, type Conversation, type ModelGroup } from "../../server/assistant";
import { useStoredState } from "../hooks";
import { useScreenShare } from "../screen-share";
import { AssistantWidgetView } from "./AssistantWidgets";
import { Icon } from "./ui";

export function AssistantPanel({ apiUrl }: { apiUrl: string }) {
  const [view, setView] = useState<"chat" | "history">("chat");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [archived, setArchived] = useState<Conversation[]>([]);
  const [runs, setRuns] = useState<Record<number, AssistantRun | undefined>>({});
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [conversationId, setConversationId] = useStoredState<number | null>("assistant.conversationId", null);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [models, setModels] = useState<ModelGroup[]>([]);
  const [selection, setSelection] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const share = useScreenShare(apiUrl);
  const conversation = conversations.find((item) => item.id === conversationId) ?? archived.find((item) => item.id === conversationId);
  const activeRun = conversationId ? runs[conversationId] : undefined;
  const modelOptions = useMemo(() => models.flatMap((group) => group.models.map((model) => ({ value: `${group.providerId ?? "default"}:${model}`, label: `${group.providerName} · ${model}`, providerId: group.providerId ?? undefined, model }))), [models]);
  const selectedModel = modelOptions.find((option) => option.value === selection) ?? modelOptions[0];

  const refreshHistory = async () => {
    try {
      const [active, old] = await Promise.all([listConversations(apiUrl), listConversations(apiUrl, true)]);
      setConversations(active); setArchived(old);
      const entries = await Promise.all([...active, ...old].map(async (item) => [item.id, (await listRuns(apiUrl, item.id))[0]] as const));
      setRuns(Object.fromEntries(entries)); setError("");
      if (!conversationId && active[0]) setConversationId(active[0].id);
    } catch (reason) { setError((reason as Error).message); }
  };
  const refreshMessages = async (id = conversationId) => { try { if (id) setMessages(await loadMessages(apiUrl, id)); else setMessages([]); } catch (reason) { setError((reason as Error).message); } };
  useEffect(() => { void Promise.all([refreshHistory(), listModels(apiUrl).then((value) => { setModels(value); if (!selection) { const first = value.flatMap((group) => group.models.map((model) => `${group.providerId ?? "default"}:${model}`))[0]; if (first) setSelection(first); } }).catch((reason) => setError((reason as Error).message))]); }, [apiUrl]);
  useEffect(() => { void refreshMessages(); }, [conversationId, apiUrl]);
  useEffect(() => {
    if (!conversationId) return;
    const source = new EventSource(`${apiUrl.replace(/\/$/, "")}/api/conversations/${conversationId}/events`);
    source.addEventListener("text", (event) => {
      const delta = String((JSON.parse((event as MessageEvent).data) as { delta?: unknown }).delta ?? "");
      setMessages((current) => {
        const next = [...current]; const index = next.findLastIndex((item) => item.role === "assistant");
        if (index >= 0) next[index] = { ...next[index]!, content: next[index]!.content + delta };
        return next;
      });
    });
    source.addEventListener("tool", (event) => {
      const tool = JSON.parse((event as MessageEvent).data);
      setMessages((current) => { const next = [...current]; const index = next.findLastIndex((item) => item.role === "assistant"); if (index >= 0) next[index] = { ...next[index]!, metadata: { ...next[index]!.metadata, tools: [...(next[index]!.metadata.tools ?? []), tool] } }; return next; });
    });
    const reload = () => { void Promise.all([refreshMessages(conversationId), refreshHistory()]); };
    source.addEventListener("done", reload); source.addEventListener("error", reload); source.addEventListener("cancelled", reload);
    return () => source.close();
  }, [conversationId, apiUrl]);
  useEffect(() => { const timer = setInterval(() => { void refreshHistory(); if (conversationId && activeRun && ["queued", "running"].includes(activeRun.status)) void refreshMessages(); }, 1800); return () => clearInterval(timer); }, [conversationId, activeRun?.status, apiUrl]);

  const open = (id: number) => { setConversationId(id); setView("chat"); };
  const create = async () => { try { const next = await createConversation(apiUrl); await refreshHistory(); open(next.id); } catch (reason) { setError((reason as Error).message); } };
  const mutate = async (id: number, change: { title?: string; archived?: boolean }) => { try { await updateConversation(apiUrl, id, change); await refreshHistory(); } catch (reason) { setError((reason as Error).message); } };
  const remove = async (id: number) => { if (!confirm("Delete this conversation and its attachments?")) return; try { await deleteConversation(apiUrl, id); if (conversationId === id) setConversationId(null); await refreshHistory(); } catch (reason) { setError((reason as Error).message); } };
  const submit = async () => {
    if ((!input.trim() && !files.length) || !selectedModel || activeRun?.status === "running" || activeRun?.status === "queued") return;
    try {
      let id = conversationId;
      if (!id) { id = (await createConversation(apiUrl)).id; setConversationId(id); }
      const text = input.trim(); setInput(""); setFiles([]);
      await sendAssistantMessage(apiUrl, id, { message: text, files, screenFrame: share.currentFrame(), providerId: selectedModel.providerId, model: selectedModel.model });
      await Promise.all([refreshMessages(id), refreshHistory()]);
    } catch (reason) { setError((reason as Error).message); }
  };
  const addWidget = (widget: AssistantWidget) => setMessages((current) => [...current, { id: Date.now(), conversationId: conversationId ?? 0, role: "assistant", content: "", metadata: { widgets: [widget] }, createdAt: new Date().toISOString() }]);

  if (view === "history") return <div className="assistant-panel history-view">
    <header className="sidebar-header"><div><span>Assistant</span><h2>History</h2></div><button title="New conversation" onClick={() => void create()}><Plus size={15} /></button></header>
    <ConversationList title="Conversations" items={conversations} runs={runs} open={open} mutate={mutate} remove={remove} />
    <ConversationList title="Archived" items={archived} runs={runs} open={open} mutate={mutate} remove={remove} archived />
  </div>;

  return <div className="assistant-panel">
    <header className="sidebar-header"><div><span>Assistant</span><h2>{conversation?.title ?? "New conversation"}</h2></div><div className="assistant-header-actions"><button title="History" onClick={() => setView("history")}><History size={15} /></button><button title="New conversation" onClick={() => void create()}><Plus size={15} /></button><button className={share.state.active ? "sharing" : ""} title="Share screen" onClick={share.state.active ? share.stop : share.start}><Icon name="share" /></button></div></header>
    <div className="assistant-messages">
      {error ? <div className="assistant-error">{error}</div> : null}
      {messages.length ? messages.map((message) => <article key={message.id} className={`chat-message ${message.role}`}>
        {message.content ? <Markdown content={message.content} /> : message.role === "assistant" && activeRun ? <p className="generating">Generating…</p> : null}
        {message.metadata.attachments?.map((file) => <small key={file}>{file.split("/").at(-1)}</small>)}
        {message.metadata.tools?.map((tool, index) => <details className="tool-activity" key={index}><summary>{String((tool as { name?: unknown }).name ?? "Tool")} · {String((tool as { phase?: unknown }).phase ?? "")}</summary><pre>{JSON.stringify(tool, null, 2)}</pre></details>)}
        {message.metadata.widgets?.map((widget, index) => <AssistantWidgetView key={index} widget={widget} apiUrl={apiUrl} onAction={addWidget} />)}
      </article>) : <div className="assistant-welcome"><span>Product intelligence</span><h3>Ask about the catalogue.</h3><p>Start a conversation, attach files, or share your screen.</p></div>}
    </div>
    <div className="assistant-composer-shell">
      {files.length ? <div className="attachment-chips">{files.map((file, index) => <span key={`${file.name}:${index}`}>{file.name}<button onClick={() => setFiles(files.filter((_, item) => item !== index))}><X size={11} /></button></span>)}</div> : null}
      <textarea value={input} onChange={(event) => setInput(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(); } }} placeholder="Ask, compare, investigate…" rows={3} />
      <div className="composer-controls"><input ref={fileRef} type="file" multiple hidden onChange={(event) => setFiles([...files, ...Array.from(event.currentTarget.files ?? [])])} /><button title="Attach files" onClick={() => fileRef.current?.click()}><Paperclip size={15} /></button><select value={selectedModel?.value ?? ""} onChange={(event) => setSelection(event.currentTarget.value)}>{modelOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><button className="send-button" disabled={(!input.trim() && !files.length) || !!activeRun && ["queued", "running"].includes(activeRun.status)} onClick={() => void submit()}><ArrowUp size={16} /></button></div>
    </div>
  </div>;
}

function Markdown({ content }: { content: string }) {
  const html = useMemo(() => DOMPurify.sanitize(marked.parse(content, { async: false }) as string, { ADD_ATTR: ["target", "rel"] }), [content]);
  return <div className="message-markdown" dangerouslySetInnerHTML={{ __html: html }} />;
}

function ConversationList({ title, items, runs, open, mutate, remove, archived = false }: { title: string; items: Conversation[]; runs: Record<number, AssistantRun | undefined>; open(id: number): void; mutate(id: number, change: { title?: string; archived?: boolean }): void; remove(id: number): void; archived?: boolean }) {
  return <section className="conversation-section"><h3>{title}</h3>{items.length ? items.map((item) => <article className="conversation-row" key={item.id}><button className="conversation-open" onClick={() => open(item.id)}><strong>{item.title}</strong><span>{runs[item.id]?.status ?? "ready"}</span></button><div><button title="Rename" onClick={() => { const title = prompt("Conversation title", item.title); if (title?.trim()) mutate(item.id, { title }); }}><Pencil size={13} /></button><button title={archived ? "Restore" : "Archive"} onClick={() => mutate(item.id, { archived: !archived })}>{archived ? <ArchiveRestore size={13} /> : <Archive size={13} />}</button><button title="Delete" onClick={() => remove(item.id)}><Trash2 size={13} /></button></div></article>) : <p className="muted">None</p>}</section>;
}
