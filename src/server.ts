#!/usr/bin/env bun
import { createDefaultActionRegistry } from "./operations/actions.ts";
import { InteractiveAssistant } from "./operations/assistant.ts";
import { OperationsDatabase } from "./operations/database.ts";
import type { JsonObject } from "./types.ts";

export interface ServerOptions {
  port?: number;
  token?: string;
  database?: OperationsDatabase;
  products?: JsonObject[];
  assistant?: Pick<InteractiveAssistant, "reply">;
}

function json(value: unknown, status = 200): Response {
  return Response.json(value, { status, headers: { "cache-control": "no-store" } });
}

export function createServer(options: ServerOptions = {}) {
  const db = options.database ?? new OperationsDatabase();
  const actions = createDefaultActionRegistry();
  const products = options.products ?? db.listProducts().map((item) => ({ ...item.product, storeId: item.storeId, productId: item.productId }));
  const assistant = options.assistant ?? (process.env.OPENAI_API_KEY ? new InteractiveAssistant(db, actions, products) : null);
  return Bun.serve({
    idleTimeout: -1,
    port: options.port ?? Number(process.env.PORT ?? 3000),
    async fetch(request) {
      const url = new URL(request.url);

      if (request.method === "GET" && url.pathname === "/api/stores") {
        return json(db.listStores());
      }
      if (request.method === "POST" && url.pathname === "/api/stores") {
        const input = await request.json() as any;
        db.addStore(input);
        return json({ ok: true });
      }
      if (request.method === "PUT" && url.pathname.startsWith("/api/stores/")) {
        const id = url.pathname.split("/")[3];
        const input = await request.json() as any;
        db.addStore({ ...input, id });
        return json({ ok: true });
      }
      if (request.method === "DELETE" && url.pathname.startsWith("/api/stores/")) {
        const id = url.pathname.split("/")[3];
        if (id) db.deleteStore(id);
        return json({ ok: true });
      }

      if (request.method === "GET" && url.pathname === "/api/products") {
        return json(db.listProducts());
      }
      if (request.method === "GET" && url.pathname.startsWith("/api/products/")) {
        const storeId = url.pathname.split("/")[3];
        if (storeId) {
            return json(db.listStoreProducts(storeId));
        }
      }
      if (request.method === "GET" && url.pathname === "/api/events") {
        return json(db.listEvents());
      }
      if (request.method === "POST" && url.pathname === "/api/sync") {
        const { syncStoreStream } = await import("./sync.ts");
        const enabledStores = db.listStores().filter((store) => store.enabled !== false);
        const config = { stores: enabledStores, defaultSyncIntervalMinutes: 30 };
        const storeIdParam = url.searchParams.get("storeId");
        
        const targetStores = storeIdParam 
            ? enabledStores.filter(s => s.id === storeIdParam)
            : enabledStores;
            
        const now = new Date();
        const observedAt = now.toISOString().replace(/\.\d{3}Z$/, "Z");
        const runId = observedAt.replaceAll(/[-:]/g, "").replace("T", "-").replace("Z", "Z");
        
        const stream = new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder();
            const emit = (event: string, data: unknown) => controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
            try {
              for (const store of targetStores) {
                 for await (const message of syncStoreStream(config, store, runId, observedAt, {}, db)) {
                   emit("progress", message);
                 }
              }
              emit("done", { ok: true });
            } catch (error) {
              emit("error", { error: (error as Error).message });
            } finally {
              controller.close();
            }
          }
        });
        return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-store", "connection": "keep-alive" } });
      }
      if (request.method === "GET" && url.pathname === "/api/config") {
        return json({ stores: db.listStores(), defaultSyncIntervalMinutes: 30 });
      }
      if (request.method === "GET" && url.pathname === "/api/health") return json({ ok: true });
      if (request.method === "GET" && url.pathname === "/api/actions") return json(actions.list());
      if (request.method === "GET" && url.pathname === "/api/flags") return json(db.listFlags(url.searchParams.get("sourceId") ?? undefined, url.searchParams.get("productId") ?? undefined));
      if (request.method === "GET" && url.pathname === "/api/rules") return json(db.listRules());
      if (request.method === "GET" && url.pathname === "/api/audit") return json(db.listAudit());
      if (request.method === "GET" && url.pathname === "/api/conversations") return json(db.listConversations());
      if (request.method === "GET" && /^\/api\/conversations\/\d+\/messages$/.test(url.pathname)) {
        return json(db.listMessages(Number(url.pathname.split("/")[3])));
      }
      if (request.method === "POST" && url.pathname === "/api/conversations") {
        const input = await request.json().catch(() => ({})) as { title?: string };
        return json(db.createConversation(input.title), 201);
      }
      if (request.method === "POST" && /^\/api\/conversations\/\d+\/messages$/.test(url.pathname)) {
        if (!assistant) return json({ error: "OPENAI_API_KEY is not configured" }, 503);
        const conversationId = Number(url.pathname.split("/")[3]);
        const input = await request.json() as { message?: string; screenFrame?: string };
        if (!input.message?.trim()) return json({ error: "message is required" }, 400);
        const stream = new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder();
            const emit = (event: string, data: unknown) => controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
            try {
              emit("status", { state: "thinking" });
              const result = await assistant.reply(conversationId, input.message!, input.screenFrame);
              for (const toolCall of result.toolCalls ?? []) emit("tool", toolCall);
              for (const widget of result.widgets ?? []) emit("widget", widget);
              emit("text", { text: result.text });
              emit("result", result);
              emit("done", {});
            } catch (error) {
              emit("error", { error: (error as Error).message });
            } finally {
              controller.close();
            }
          }
        });
        return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-store" } });
      }
      if (request.method === "POST" && url.pathname === "/api/rules") {
        const input = await request.json() as { name: string; instruction: string; eventTypes?: string[]; sourceIds?: string[]; enabled?: boolean };
        return json(db.createRule({ ...input, eventTypes: input.eventTypes ?? [], sourceIds: input.sourceIds ?? [] }), 201);
      }
      if (request.method === "POST" && url.pathname.startsWith("/api/actions/")) {
        const name = decodeURIComponent(url.pathname.slice("/api/actions/".length));
        try {
          return json(await actions.execute(name, await request.json() as Record<string, unknown>, { db, actor: "api", products }));
        } catch (error) {
          return json({ error: (error as Error).message }, 400);
        }
      }
      if (request.method === "POST" && url.pathname === "/api/realtime/client-secret") {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) return json({ error: "OPENAI_API_KEY is not configured" }, 503);
        const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
          method: "POST",
          headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
          body: JSON.stringify({
            expires_after: { anchor: "created_at", seconds: 600 },
            session: {
              type: "realtime",
              model: process.env.OPENAI_REALTIME_MODEL ?? "gpt-realtime",
              instructions: "You are the product intelligence assistant. External product sources are read-only."
            }
          })
        });
        return new Response(await response.text(), { status: response.status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
      }
      return json({ error: "not found" }, 404);
    }
  });
}

if (import.meta.main) {
  const server = createServer();
  console.log(`Product intelligence API listening on ${server.url}`);
}
