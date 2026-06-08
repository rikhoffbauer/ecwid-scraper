export interface WidgetProduct { sourceId: string; productId: string; name: string; price?: number; imageUrl?: string; url?: string; storeName?: string; }
export type AssistantWidget =
  | { type: "product"; product: WidgetProduct; label?: string }
  | { type: "product-list"; title: string; products: WidgetProduct[] }
  | { type: "comparison"; title: string; products: WidgetProduct[]; bestProductId?: string }
  | { type: "price-history"; title: string; currency?: string; points: Array<{ at: string; value: number }> }
  | { type: "event-list"; title: string; events: Array<{ eventType: string; observedAt: string; productId: string; path?: string }> }
  | { type: "analysis-summary"; title: string; metrics: Array<{ label: string; value: string; tone?: "default" | "positive" | "warning" }> }
  | { type: "action-result"; title: string; detail?: string; tone: "success" | "error"; undo?: { action: string; input: Record<string, unknown> } }
  | { type: "artifact"; title: string; url: string; mediaType?: string };

export interface AssistantMessageMetadata { responseId?: string; toolCalls?: Array<{ name: string; input: unknown; output: unknown }>; tools?: unknown[]; widgets?: AssistantWidget[]; streaming?: boolean; error?: string; attachments?: string[]; model?: string; providerId?: number | null; }
export interface AssistantMessage { id: number; conversationId: number; role: "user" | "assistant"; content: string; metadata: AssistantMessageMetadata; createdAt: string; }
export interface Conversation { id: number; title: string; titleSource: "default" | "ai" | "manual"; archivedAt: string | null; createdAt: string; updatedAt: string; }
export interface AssistantRun { id: number; conversationId: number; model: string; status: "queued" | "running" | "completed" | "failed" | "cancelled"; error: string | null; }
export interface ModelGroup { providerId: number | null; providerName: string; models: string[]; error: string | null; }

async function api<T>(baseUrl: string, route: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}${route}`, init);
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  return response.json() as Promise<T>;
}
export const createConversation = (baseUrl: string) => api<Conversation>(baseUrl, "/api/conversations", { method: "POST", body: "{}" });
export const listConversations = (baseUrl: string, archived = false) => api<Conversation[]>(baseUrl, `/api/conversations?archived=${archived}`);
export const updateConversation = (baseUrl: string, id: number, input: { title?: string; archived?: boolean }) => api<Conversation>(baseUrl, `/api/conversations/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
export const deleteConversation = (baseUrl: string, id: number) => api<{ removed: boolean }>(baseUrl, `/api/conversations/${id}`, { method: "DELETE" });
export const listRuns = (baseUrl: string, id: number) => api<AssistantRun[]>(baseUrl, `/api/conversations/${id}/runs`);
export const listModels = (baseUrl: string) => api<ModelGroup[]>(baseUrl, "/api/llm-models");
export const loadMessages = (baseUrl: string, id: number) => api<Array<Omit<AssistantMessage, "metadata"> & { metadata: unknown }>>(baseUrl, `/api/conversations/${id}/messages`).then((items) => items.map((item) => ({ ...item, metadata: normalizeMetadata(item.metadata) })));
export const executeAction = (baseUrl: string, action: string, input: Record<string, unknown>) => api(baseUrl, `/api/actions/${encodeURIComponent(action)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });

function normalizeMetadata(value: unknown): AssistantMessageMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as AssistantMessageMetadata;
}

export async function sendAssistantMessage(baseUrl: string, conversationId: number, input: { message: string; screenFrame?: string; providerId?: number; model: string; files: File[] }): Promise<{ runId: number }> {
  const form = new FormData();
  form.set("message", input.message);
  form.set("model", input.model);
  if (input.providerId) form.set("providerId", String(input.providerId));
  if (input.screenFrame) form.set("screenFrame", input.screenFrame);
  for (const file of input.files) form.append("files", file);
  return api(baseUrl, `/api/conversations/${conversationId}/messages`, { method: "POST", body: form });
}
