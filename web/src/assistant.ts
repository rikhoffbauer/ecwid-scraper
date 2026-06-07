export interface WidgetProduct {
  sourceId: string;
  productId: string;
  name: string;
  price?: number;
  imageUrl?: string;
  url?: string;
  storeName?: string;
}

export type AssistantWidget =
  | { type: "product"; product: WidgetProduct; label?: string }
  | { type: "product-list"; title: string; products: WidgetProduct[] }
  | { type: "comparison"; title: string; products: WidgetProduct[]; bestProductId?: string }
  | { type: "price-history"; title: string; currency?: string; points: Array<{ at: string; value: number }> }
  | { type: "event-list"; title: string; events: Array<{ eventType: string; observedAt: string; productId: string; path?: string }> }
  | { type: "analysis-summary"; title: string; metrics: Array<{ label: string; value: string; tone?: "default" | "positive" | "warning" }> }
  | { type: "action-result"; title: string; detail?: string; tone: "success" | "error"; undo?: { action: string; input: Record<string, unknown> } }
  | { type: "artifact"; title: string; url: string; mediaType?: string };

export interface AssistantMessageMetadata {
  responseId?: string;
  toolCalls?: Array<{ name: string; input: unknown; output: unknown }>;
  widgets?: AssistantWidget[];
}

export interface AssistantMessage {
  id: number;
  conversationId: number;
  role: "user" | "assistant";
  content: string;
  metadata: AssistantMessageMetadata;
  createdAt: string;
}

export interface Conversation {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssistantStreamEvent {
  event: "status" | "tool" | "widget" | "text" | "result" | "done" | "error";
  data: unknown;
}

async function api<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers }
  });
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  return response.json() as Promise<T>;
}

export function createConversation(baseUrl: string): Promise<Conversation> {
  return api(baseUrl, "/api/conversations", { method: "POST", body: "{}" });
}

export function loadMessages(baseUrl: string, conversationId: number): Promise<AssistantMessage[]> {
  return api<Array<Omit<AssistantMessage, "metadata"> & { metadata: unknown }>>(baseUrl, `/api/conversations/${conversationId}/messages`).then((messages) => messages.map((message) => ({
    ...message,
    metadata: normalizeMetadata(message.metadata)
  })));
}

function normalizeMetadata(value: unknown): AssistantMessageMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  return {
    responseId: typeof record.responseId === "string" ? record.responseId : undefined,
    toolCalls: Array.isArray(record.toolCalls) ? record.toolCalls as AssistantMessageMetadata["toolCalls"] : undefined,
    widgets: Array.isArray(record.widgets) ? record.widgets.filter((widget): widget is AssistantWidget => !!widget && typeof widget === "object" && typeof (widget as { type?: unknown }).type === "string") : undefined
  };
}

export async function executeAction(baseUrl: string, action: string, input: Record<string, unknown>): Promise<unknown> {
  return api(baseUrl, `/api/actions/${encodeURIComponent(action)}`, { method: "POST", body: JSON.stringify(input) });
}

export async function sendAssistantMessage(
  baseUrl: string,
  conversationId: number,
  message: string,
  screenFrame: string | undefined,
  onEvent: (event: AssistantStreamEvent) => void
): Promise<void> {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message, screenFrame })
  });
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let boundary = buffer.indexOf("\n\n");
    while (boundary >= 0) {
      const chunk = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const event = chunk.match(/^event:\s*(.+)$/m)?.[1] as AssistantStreamEvent["event"] | undefined;
      const raw = chunk.match(/^data:\s*(.+)$/m)?.[1];
      if (event && raw) onEvent({ event, data: JSON.parse(raw) });
      boundary = buffer.indexOf("\n\n");
    }
  }
}
