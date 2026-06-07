import { useMemo, useState } from "react";
import { createConversation, loadMessages, sendAssistantMessage, type AssistantMessage, type AssistantWidget } from "../assistant";
import { useScreenShare } from "../screen-share";
import { AssistantWidgetView } from "./AssistantWidgets";
import { Icon } from "./ui";

export function AssistantPanel({ apiUrl }: { apiUrl: string }) {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [conversationId, setConversationId] = useState<number>();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const share = useScreenShare(apiUrl);
  const elapsed = useMemo(() => share.state.startedAt ? Math.max(0, Math.floor((Date.now() - share.state.startedAt) / 1000)) : 0, [share.state.startedAt, share.state.preview]);

  const addWidget = (widget: AssistantWidget) => setMessages((current) => [...current, { id: Date.now(), conversationId: conversationId ?? 0, role: "assistant", content: "", metadata: { widgets: [widget] }, createdAt: new Date().toISOString() }]);
  const submit = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setBusy(true); setInput("");
    try {
      let id = conversationId;
      if (!id) { id = (await createConversation(apiUrl)).id; setConversationId(id); }
      setMessages((current) => [...current, { id: Date.now(), conversationId: id!, role: "user", content: text, metadata: {}, createdAt: new Date().toISOString() }]);
      share.captureFrame();
      await sendAssistantMessage(apiUrl, id, text, share.currentFrame(), () => {});
      setMessages(await loadMessages(apiUrl, id));
    } catch (error) {
      addWidget({ type: "action-result", title: (error as Error).message, tone: "error" });
    } finally { setBusy(false); }
  };
  return <div className="assistant-panel">
    <header className="sidebar-header"><div><span>Workspace</span><h2>Assistant</h2></div><button className={share.state.active ? "sharing" : ""} onClick={share.state.active ? share.stop : share.start}><Icon name="share" />{share.state.active ? "Stop" : "Share screen"}</button></header>
    {share.state.active ? <section className="share-status">
      {share.state.preview ? <img src={share.state.preview} alt="Shared screen preview" /> : null}
      <div><span className="live-dot" /><strong>Sharing this screen</strong><small>{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")} · {share.state.voiceActive ? "voice connected" : "text mode"}</small></div>
    </section> : null}
    <div className="assistant-messages">
      {messages.length ? messages.map((message) => <article key={message.id} className={`chat-message ${message.role}`}>
        {message.content ? <p>{message.content}</p> : null}
        {message.metadata.widgets?.map((widget, index) => <AssistantWidgetView key={index} widget={widget} apiUrl={apiUrl} onAction={addWidget} />)}
      </article>) : <div className="assistant-welcome"><span>Product intelligence</span><h3>Ask about the catalogue.</h3><p>Compare offers, inspect recent changes, or share your screen for visual context.</p></div>}
    </div>
    <div className="assistant-composer"><textarea value={input} onChange={(event) => setInput(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(); } }} placeholder="Ask, compare, investigate…" rows={2} /><button disabled={!input.trim() || busy} onClick={submit}>{busy ? "…" : "Send"}</button></div>
  </div>;
}
