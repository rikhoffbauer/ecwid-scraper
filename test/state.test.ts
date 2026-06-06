import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "bun:test";
import { writeResolvedStoreState } from "../src/state.ts";
import type { StoreSyncSummary } from "../src/types.ts";

describe("resolved store state", () => {
  test("writes product shards and event indexes", async () => {
    const worktreeDir = await mkdtemp(path.join(os.tmpdir(), "ecwid-state-test-"));
    const summary: StoreSyncSummary = { storeId: "store-1", fetched: 2, created: 2, updated: 0, deleted: 0, fieldEvents: 0, productsHash: "pending" };
    await writeResolvedStoreState({
      worktreeDir,
      store: { id: "store-1", token: "token" },
      observedAt: "2026-06-06T00:00:00Z",
      fetchedProducts: [{ id: 1, name: "A", price: 10 }, { id: 2, name: "B", price: 20 }],
      events: [{ eventId: "e1", eventType: "product.created", schemaVersion: 1, source: "ecwid", storeId: "store-1", productId: "1", runId: "run", observedAt: "2026-06-06T00:00:00Z", currentHash: "hash", product: { id: 1 } }],
      eventFile: "events/2026/06/06/e1.jsonl",
      summary
    });

    const productIndex = JSON.parse(await readFile(path.join(worktreeDir, "state/products.index.json"), "utf8"));
    expect(productIndex).toMatchObject({ kind: "product-state-index", storeId: "store-1", productCount: 2 });
    expect(productIndex.records.map((record: { productId: string }) => record.productId)).toEqual(["1", "2"]);

    const eventIndex = JSON.parse(await readFile(path.join(worktreeDir, "state/events.index.json"), "utf8"));
    expect(eventIndex).toMatchObject({ kind: "event-state-index", storeId: "store-1", totalEvents: 1 });
    expect(eventIndex.eventTypes["product.created"]).toBe(1);
  });
});
