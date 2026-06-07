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
  const token = options.token ?? process.env.APP_SESSION_TOKEN;
  if (!token) throw new Error("APP_SESSION_TOKEN is required");
  const db = options.database ?? new OperationsDatabase();
  const actions = createDefaultActionRegistry();
  const products = options.products ?? [];
  const assistant = options.assistant ?? (process.env.OPENAI_API_KEY ? new InteractiveAssistant(db, actions, products) : null);
  return Bun.serve({
    port: options.port ?? Number(process.env.PORT ?? 3000),
    async fetch(request) {
      if (request.headers.get("authorization") !== `Bearer ${token}`) return json({ error: "unauthorized" }, 401);
      const url = new URL(request.url);
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
        const input = await request.json() as { message?: string };
        if (!input.message?.trim()) return json({ error: "message is required" }, 400);
        const stream = new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder();
            const emit = (event: string, data: unknown) => controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
            try {
              emit("status", { state: "thinking" });
              emit("result", await assistant.reply(conversationId, input.message!));
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
      return json({ error: "not found" }, 404);
    }
  });
}

if (import.meta.main) {
  const server = createServer();
  console.log(`Product intelligence API listening on ${server.url}`);
}
