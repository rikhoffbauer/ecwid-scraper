import { describe, expect, test } from "bun:test";
import type { AppConfig, EcwidProductsPage } from "../src/shared/types.ts";
import { syncStores } from "../src/server/sync.ts";
import { OperationsDatabase } from "../src/server/operations/database.ts";
import path from "node:path";
import os from "node:os";

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
  stores: [{ id: "store-1", token: "public_token", limit: 100, requestDelayMs: 0 } as any]
};

describe("syncStores", () => {
  test("creates, updates, deletes snapshots and writes events to database", async () => {
    const dbPath = path.join(os.tmpdir(), `test-db-${Math.random().toString(36).slice(2)}.sqlite`);
    const db = new OperationsDatabase(dbPath);
    
    const firstNow = new Date("2026-06-06T00:00:00Z");
    const secondNow = new Date("2026-06-06T00:05:00Z");

    const first = await syncStores(config, {
      now: firstNow,
      db,
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
    
    let products = db.listStoreProducts("store-1").map(p => p.productId).sort();
    expect(products).toEqual(["1", "2"]);

    const second = await syncStores(config, {
      now: secondNow,
      db,
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
    
    products = db.listStoreProducts("store-1").map(p => p.productId).sort();
    expect(products).toEqual(["1", "3"]);

    const events = db.listEvents("store-1");
    // Events: 2 created (first sync), 1 created (second sync), 1 deleted (second sync)
    // 4 field changes (price in summary, price in product, URL in summary, imageUrl in summary) -> Wait, we changed diff to only diff summary
    
    expect(events.map((event) => event.eventType).filter(e => e === "product.created").length).toBe(3);
    expect(events.map((event) => event.eventType).filter(e => e === "product.deleted").length).toBe(1);

    expect(events.find((event) => event.eventType === "product.field_changed" && event.path === "/price")).toMatchObject({
      path: "/price",
      before: 10,
      after: 11
    });
    
    db.close();
  });
});
