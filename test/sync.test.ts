import { mkdtemp, readFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "bun:test";
import type { AppConfig, EcwidProductsPage } from "../src/types.ts";
import { syncStores } from "../src/sync.ts";

function response(page: EcwidProductsPage): Response {
  return new Response(JSON.stringify(page), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

function mockFetch(pages: EcwidProductsPage[]): typeof fetch {
  let i = 0;
  return (async () => response(pages[i++] ?? pages.at(-1)!)) as unknown as typeof fetch;
}

const config: AppConfig = {
  productsRoot: "data/stores",
  eventsRoot: ".ecwid-sync/events",
  eventBranchPrefix: "events/ecwid",
  stores: [{ id: "store-1", token: "public_token", limit: 100, requestDelayMs: 0 }]
};

describe("syncStores", () => {
  test("creates, updates, deletes snapshots and writes deterministic event files", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "ecwid-sync-test-"));
    const firstNow = new Date("2026-06-06T00:00:00Z");
    const secondNow = new Date("2026-06-06T00:05:00Z");

    const first = await syncStores(config, {
      cwd,
      now: firstNow,
      fetchImpl: mockFetch([
        {
          total: 2,
          count: 2,
          offset: 0,
          limit: 100,
          items: [
            { id: 1, name: "A", price: 10 },
            { id: 2, name: "B", price: 20 }
          ]
        }
      ])
    });

    expect(first.stores[0]).toMatchObject({ created: 2, updated: 0, deleted: 0 });
    expect((await readdir(path.join(cwd, "data/stores/store-1/products"))).sort()).toEqual(["1.json", "2.json"]);

    const second = await syncStores(config, {
      cwd,
      now: secondNow,
      fetchImpl: mockFetch([
        {
          total: 2,
          count: 2,
          offset: 0,
          limit: 100,
          items: [
            { id: 1, name: "A", price: 11 },
            { id: 3, name: "C", price: 30 }
          ]
        }
      ])
    });

    expect(second.stores[0]).toMatchObject({ created: 1, updated: 1, deleted: 1 });
    expect((await readdir(path.join(cwd, "data/stores/store-1/products"))).sort()).toEqual(["1.json", "3.json"]);

    const eventRoot = path.join(cwd, ".ecwid-sync/events/store-1/2026/06/06");
    const eventFiles = await readdir(eventRoot);
    expect(eventFiles).toHaveLength(1);

    const jsonl = await readFile(path.join(eventRoot, eventFiles[0]!), "utf8");
    const events = jsonl.trim().split("\n").map((line) => JSON.parse(line));
    expect(events.map((event) => event.eventType).sort()).toEqual([
      "product.created",
      "product.deleted",
      "product.field_changed"
    ]);
    expect(events.find((event) => event.eventType === "product.field_changed")).toMatchObject({
      path: "/price",
      before: 10,
      after: 11
    });
  });
});
