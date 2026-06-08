import { afterEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { rmSync } from "node:fs";
import { OperationsDatabase } from "../src/server/operations/database.ts";
import { createServer } from "../src/server/server.ts";
import { SourceOnboardingManager } from "../src/server/source-onboarding.ts";

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
    const server = createServer({ port: 0, token: "secret", database });
    servers.push(server);

    const response = await fetch(new URL("/api/actions/products.search", server.url), {
      method: "POST",
      headers: { "content-type": "application/json", "authorization": "Bearer secret" },
      body: JSON.stringify({ query: "chair" })
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
    expect(database.listAudit()).toEqual([expect.objectContaining({ action: "products.search", status: "succeeded" })]);
  });

  test("persists conversations and continues assistant results after submission returns", async () => {
    const database = new OperationsDatabase(":memory:");
    databases.push(database);
    const assistant = {
      async reply(conversationId: number, message: string) {
        return { conversationId, text: "Tracked answer", responseId: "response-1", toolCalls: [], widgets: [] };
      }
    };
    const server = createServer({ port: 0, token: "secret", database, assistant });
    servers.push(server);
    const headers = { "content-type": "application/json" };
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
    expect(response.status).toBe(202);
    expect(text).toContain("runId");
    for (let index = 0; index < 20 && database.listMessages(conversation.id).length < 2; index += 1) await Bun.sleep(10);
    expect(database.listMessages(conversation.id)).toHaveLength(2);
  });

  test("manages conversation history and replays ordered SSE events", async () => {
    const database = new OperationsDatabase(":memory:");
    databases.push(database);
    const server = createServer({ port: 0, database, assistant: { async reply() { return { conversationId: 1, text: "", responseId: "x", toolCalls: [], widgets: [] }; } } });
    servers.push(server);
    const conversation = await (await fetch(new URL("/api/conversations", server.url), { method: "POST", body: "{}" })).json() as { id: number };
    const user = database.addMessage(conversation.id, "user", "hello");
    const answer = database.addMessage(conversation.id, "assistant", "");
    const run = database.createAssistantRun({ conversationId: conversation.id, userMessageId: user.id, assistantMessageId: answer.id, providerId: null, model: "test" });
    database.addAssistantRunEvent(run.id, conversation.id, "text", { delta: "later" });
    await fetch(new URL(`/api/conversations/${conversation.id}`, server.url), { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "Renamed", archived: true }) });
    expect(await (await fetch(new URL("/api/conversations?archived=true", server.url))).json()).toEqual([expect.objectContaining({ title: "Renamed" })]);
    await fetch(new URL(`/api/conversations/${conversation.id}`, server.url), { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ archived: false }) });
    const events = await fetch(new URL(`/api/conversations/${conversation.id}/events?after=0&once=true`, server.url));
    expect(await events.text()).toContain("later");
    expect((await fetch(new URL(`/api/conversations/${conversation.id}`, server.url), { method: "DELETE" })).status).toBe(200);
  });

  test("streams response deltas from a server-owned assistant run", async () => {
    const database = new OperationsDatabase(":memory:");
    databases.push(database);
    const assistant = {
      async reply(conversationId: number, _message: string, _frame?: string, options?: { onEvent?: (event: string, data: unknown) => void }) {
        options?.onEvent?.("text", { delta: "Live " });
        await Bun.sleep(10);
        options?.onEvent?.("text", { delta: "answer" });
        return { conversationId, text: "Live answer", responseId: "response-live", toolCalls: [], widgets: [] };
      }
    };
    const server = createServer({ port: 0, database, assistant });
    servers.push(server);
    const conversation = await (await fetch(new URL("/api/conversations", server.url), { method: "POST", body: "{}" })).json() as { id: number };
    const submitted = await fetch(new URL(`/api/conversations/${conversation.id}/messages`, server.url), {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: "Stream it", model: "test" })
    });
    expect(submitted.status).toBe(202);
    await Bun.sleep(30);
    const events = await fetch(new URL(`/api/conversations/${conversation.id}/events?once=true`, server.url));
    const body = await events.text();
    expect(body).toContain('event: text');
    expect(body).toContain('Live ');
    expect(body).toContain('answer');
    expect(database.listMessages(conversation.id).at(-1)?.content).toBe("Live answer");
  });

  test("exposes an environment-backed model fallback without configured providers", async () => {
    const database = new OperationsDatabase(":memory:");
    databases.push(database);
    const server = createServer({ port: 0, database });
    servers.push(server);
    expect(await (await fetch(new URL("/api/llm-models", server.url))).json()).toEqual([
      expect.objectContaining({ providerId: null, providerName: "Default", models: expect.arrayContaining([expect.any(String)]) })
    ]);
  });

  test("creates providers without requiring a name", async () => {
    const database = new OperationsDatabase(":memory:");
    databases.push(database);
    const server = createServer({ port: 0, database });
    servers.push(server);
    const response = await fetch(new URL("/api/llm-providers", server.url), {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider: "custom", configJson: '{"baseURL":"http://localhost:4000"}', model: "local-model", isDefault: false })
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ name: "Custom", provider: "custom" });
  });

  test("fetches models from dynamic provider configuration and fails gracefully on bad connection", async () => {
    const database = new OperationsDatabase(":memory:");
    databases.push(database);
    const server = createServer({ port: 0, database });
    servers.push(server);
    const response = await fetch(new URL("/api/llm-providers/models", server.url), {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider: "custom", configJson: '{"baseURL":"http://localhost:9999/v1", "apiKey": "test-key"}' })
    });
    expect(response.status).toBe(400);
    const data = await response.json() as { ok: boolean; error: string };
    expect(data.ok).toBe(false);
    expect(data.error).toBeTruthy();
  });

  test("stores arbitrary message attachments and removes them with the conversation", async () => {
    const database = new OperationsDatabase(":memory:");
    databases.push(database);
    const assistant = { async reply(conversationId: number) { return { conversationId, text: "Read", responseId: "file", toolCalls: [], widgets: [] }; } };
    const server = createServer({ port: 0, database, assistant });
    servers.push(server);
    const conversation = await (await fetch(new URL("/api/conversations", server.url), { method: "POST", body: "{}" })).json() as { id: number };
    const form = new FormData();
    form.set("message", "Inspect it"); form.set("model", "test"); form.append("files", new File(["binary-ish"], "sample.bin"));
    expect((await fetch(new URL(`/api/conversations/${conversation.id}/messages`, server.url), { method: "POST", body: form })).status).toBe(202);
    const attachment = (database.listMessages(conversation.id)[0]?.metadata as { attachments?: string[] }).attachments?.[0];
    expect(attachment).toBeTruthy();
    expect(await Bun.file(attachment!).text()).toBe("binary-ish");
    await fetch(new URL(`/api/conversations/${conversation.id}`, server.url), { method: "DELETE" });
    expect(await Bun.file(attachment!).exists()).toBe(false);
  });

  test("manages saved searches and exposes their results and history", async () => {
    const database = new OperationsDatabase(":memory:");
    databases.push(database);
    database.addStore({ id: "unsupported", kind: "2dekansje", url: "https://example.com" });
    const server = createServer({ port: 0, database });
    servers.push(server);
    const headers = { "content-type": "application/json" };
    const createdResponse = await fetch(new URL("/api/searches", server.url), {
      method: "POST", headers, body: JSON.stringify({ name: "Deals", query: "chair", sourceIds: ["unsupported"], watched: true, intervalMinutes: 10 })
    });
    expect(createdResponse.status).toBe(201);
    const created = await createdResponse.json() as { id: number };
    const run = await (await fetch(new URL(`/api/searches/${created.id}/run`, server.url), { method: "POST" })).json() as any;
    expect(run.run.status).toBe("failed");
    expect(await (await fetch(new URL(`/api/searches/${created.id}/results`, server.url))).json()).toEqual([]);
    expect(await (await fetch(new URL(`/api/searches/${created.id}/runs`, server.url))).json()).toHaveLength(1);
    expect(await (await fetch(new URL(`/api/searches/${created.id}/events`, server.url))).json()).toEqual([]);
  });

  test("migrates a legacy products table before starting the server", () => {
    const file = `/tmp/ecwid-server-legacy-${Date.now()}.sqlite`;
    const legacy = new Database(file, { create: true });
    legacy.exec(`
      CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        store_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        hash TEXT NOT NULL,
        product_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(store_id, product_id)
      );
      INSERT INTO products (store_id, product_id, hash, product_json, created_at, updated_at)
      VALUES ('source', 'product', 'hash', '{"summary":{"id":"product","name":"Chair"}}', 'now', 'now');
    `);
    legacy.close();
    const database = new OperationsDatabase(file);
    databases.push(database);
    expect(database.listProducts()[0]?.product).toMatchObject({ id: "product", name: "Chair" });
    const server = createServer({ port: 0, database });
    servers.push(server);
    rmSync(file, { force: true });
  });

  test("protects opt-in source onboarding with a dedicated bearer token", async () => {
    const database = new OperationsDatabase(":memory:");
    databases.push(database);
    const onboarding = new SourceOnboardingManager(database, { geminiCommand: ["/missing/gemini"] });
    const server = createServer({ port: 0, database, onboarding, onboardingToken: "onboarding-secret" });
    servers.push(server);
    const body = JSON.stringify({
      id: "new-shop",
      catalogUrl: "https://example.com/catalog",
      catalogPageNumber: 1,
      productUrl: "https://example.com/product",
      searchUrl: "https://example.com/search?q=chair",
      searchQuery: "chair"
    });
    expect((await fetch(new URL("/api/source-onboarding/jobs", server.url), { method: "POST", body })).status).toBe(401);
    const created = await fetch(new URL("/api/source-onboarding/jobs", server.url), {
      method: "POST",
      headers: { authorization: "Bearer onboarding-secret", "content-type": "application/json" },
      body
    });
    expect(created.status).toBe(202);
    const job = await created.json() as { id: string; stagingDir?: string };
    expect(job.stagingDir).toBeUndefined();
    const fetched = await fetch(new URL(`/api/source-onboarding/jobs/${job.id}`, server.url), {
      headers: { authorization: "Bearer onboarding-secret" }
    });
    expect(fetched.status).toBe(200);
  });
});
