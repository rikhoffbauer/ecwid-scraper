#!/usr/bin/env bun
import { pathToFileURL } from "node:url";
import type { GeneratedSourcePlugin, ReadOnlyHttpClient } from "./types.ts";
import { assertPublicHttpUrl } from "./generated.ts";

type RequestMessage =
  | { operation: "catalog"; adapterPath: string; input: Parameters<GeneratedSourcePlugin["fetchCatalogPage"]>[0] }
  | { operation: "product"; adapterPath: string; input: Parameters<GeneratedSourcePlugin["fetchProduct"]>[0] }
  | { operation: "search"; adapterPath: string; input: Parameters<GeneratedSourcePlugin["fetchSearchResults"]>[0] };

const http: ReadOnlyHttpClient = {
  async fetch(input, init) {
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    if (method !== "GET" && method !== "HEAD") throw new Error(`Generated adapter HTTP is read-only; ${method} is forbidden`);
    let url = assertPublicHttpUrl(input instanceof Request ? input.url : input);
    for (let redirect = 0; redirect < 6; redirect += 1) {
      const response = await globalThis.fetch(url, { ...init, method, redirect: "manual" });
      if (response.status < 300 || response.status >= 400 || !response.headers.get("location")) return response;
      url = assertPublicHttpUrl(new URL(response.headers.get("location")!, url));
    }
    throw new Error("Generated adapter exceeded redirect limit");
  }
};

async function main(): Promise<void> {
  const message = JSON.parse(await Bun.stdin.text()) as RequestMessage;
  const imported = await import(`${pathToFileURL(message.adapterPath).href}?run=${crypto.randomUUID()}`) as Partial<GeneratedSourcePlugin>;
  const context = { http };
  let result: unknown;
  if (message.operation === "catalog") {
    if (typeof imported.fetchCatalogPage !== "function") throw new Error("Generated adapter does not export fetchCatalogPage");
    result = await imported.fetchCatalogPage(message.input, context);
  } else if (message.operation === "product") {
    if (typeof imported.fetchProduct !== "function") throw new Error("Generated adapter does not export fetchProduct");
    result = await imported.fetchProduct(message.input, context);
  } else {
    if (typeof imported.fetchSearchResults !== "function") throw new Error("Generated adapter does not export fetchSearchResults");
    result = await imported.fetchSearchResults(message.input, context);
  }
  process.stdout.write(`${JSON.stringify({ ok: true, result })}\n`);
}

main().catch((error: unknown) => {
  process.stdout.write(`${JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) })}\n`);
  process.exitCode = 1;
});
