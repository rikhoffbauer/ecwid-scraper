import { afterEach, describe, expect, test } from "bun:test";
import { OperationsDatabase } from "../src/operations/database.ts";
import { createServer } from "../src/server.ts";

const servers: Array<ReturnType<typeof createServer>> = [];
const databases: OperationsDatabase[] = [];

afterEach(() => {
  for (const server of servers.splice(0)) server.stop(true);
  for (const database of databases.splice(0)) database.close();
});

describe("authenticated operational API", () => {
  test("rejects unauthorized requests and executes internal actions", async () => {
    const database = new OperationsDatabase(":memory:");
    databases.push(database);
    const server = createServer({ port: 0, token: "secret", database, products: [{ id: "1", name: "Chair" }] });
    servers.push(server);

    expect((await fetch(new URL("/api/health", server.url))).status).toBe(401);
    const response = await fetch(new URL("/api/actions/products.search", server.url), {
      method: "POST",
      headers: { authorization: "Bearer secret", "content-type": "application/json" },
      body: JSON.stringify({ query: "chair" })
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: "1", name: "Chair" }]);
    expect(database.listAudit()).toEqual([expect.objectContaining({ action: "products.search", status: "succeeded" })]);
  });

  test("persists conversations and streams assistant results", async () => {
    const database = new OperationsDatabase(":memory:");
    databases.push(database);
    const assistant = {
      async reply(conversationId: number, message: string) {
        database.addMessage(conversationId, "user", message);
        database.addMessage(conversationId, "assistant", "Tracked answer");
        return { conversationId, text: "Tracked answer", responseId: "response-1", toolCalls: [] };
      }
    };
    const server = createServer({ port: 0, token: "secret", database, assistant });
    servers.push(server);
    const headers = { authorization: "Bearer secret", "content-type": "application/json" };
    const conversation = await (await fetch(new URL("/api/conversations", server.url), {
      method: "POST",
      headers,
      body: JSON.stringify({ title: "Investigation" })
    })).json() as { id: number };
    const response = await fetch(new URL(`/api/conversations/${conversation.id}/messages`, server.url), {
      method: "POST",
      headers,
      body: JSON.stringify({ message: "Find unusual offers" })
    });
    const text = await response.text();
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(text).toContain("Tracked answer");
    expect(database.listMessages(conversation.id)).toHaveLength(2);
  });
});
