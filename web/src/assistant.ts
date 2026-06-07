export interface AssistantMessage {
  id: number;
  conversationId: number;
  role: "user" | "assistant";
  content: string;
  metadata: unknown;
  createdAt: string;
}

export interface Conversation {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

async function api<T>(baseUrl: string, token: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...init?.headers }
  });
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  return response.json() as Promise<T>;
}

export function createConversation(baseUrl: string, token: string): Promise<Conversation> {
  return api(baseUrl, token, "/api/conversations", { method: "POST", body: "{}" });
}

export function loadMessages(baseUrl: string, token: string, conversationId: number): Promise<AssistantMessage[]> {
  return api(baseUrl, token, `/api/conversations/${conversationId}/messages`);
}

export async function sendAssistantMessage(baseUrl: string, token: string, conversationId: number, message: string): Promise<string> {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ message })
  });
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  const text = await response.text();
  const resultLine = text.split("\n").find((line) => line.startsWith("data: ") && line.includes('"text"'));
  if (!resultLine) throw new Error("Assistant returned no result");
  return (JSON.parse(resultLine.slice(6)) as { text: string }).text;
}
