import { afterEach, describe, expect, test } from "bun:test";
import { OperationsDatabase } from "../src/server/operations/database.ts";
import { createSearchScheduler, runDueSavedSearches, runSavedSearch, searchSources } from "../src/server/searches.ts";

const databases: OperationsDatabase[] = [];
afterEach(() => databases.splice(0).forEach((db) => db.close()));

function database() {
  const db = new OperationsDatabase(":memory:");
  databases.push(db);
  db.addStore({ id: "good", token: "token", requestDelayMs: 0 });
  db.addStore({ id: "bad", kind: "2dekansje", url: "https://bad.example" });
  return db;
}

function fetchResult(name: string, price = 10): typeof fetch {
  return (async (input) => {
    const url = new URL(String(input));
    if (url.hostname === "bad.example") throw new Error("source unavailable");
    return Response.json({ total: 1, count: 1, offset: 0, limit: 200, items: [{ id: 1, name, price }] });
  }) as typeof fetch;
}

describe("direct and watched searches", () => {
  test("returns partial direct results without mutating the catalogue", async () => {
    const db = database();
    const result = await searchSources(db.listStores(), { query: "chair", sourceIds: ["good", "bad"] }, { fetchImpl: fetchResult("Chair") });
    expect(result.sources).toEqual([
      expect.objectContaining({ sourceId: "good", status: "succeeded", count: 1 }),
      expect.objectContaining({ sourceId: "bad", status: "failed", count: 0 })
    ]);
    expect(db.listProducts()).toHaveLength(0);
  });

  test("runs a saved non-watched search without mutating catalogue or membership", async () => {
    const db = database();
    const search = db.createSavedSearch({ name: "Chairs", query: "chair", sourceIds: ["good"], watched: false });
    const result = await runSavedSearch(db, search, { fetchImpl: fetchResult("Chair") });
    expect(result.products).toHaveLength(1);
    expect(db.listProducts()).toEqual([]);
    expect(db.listSavedSearchResults(search.id)).toEqual([]);
    expect(db.listSavedSearchRuns(search.id)).toHaveLength(1);
  });

  test("reconciles successful watched sources, retains failed-source membership, and never deletes catalogue products", async () => {
    const db = database();
    const search = db.createSavedSearch({ name: "Chairs", query: "chair", sourceIds: ["good", "bad"], watched: true });
    const seedRun = db.recordSavedSearchRun({ searchId: search.id, status: "succeeded", resultCount: 1, sourceResults: [], startedAt: "2026-01-01T00:00:00.000Z", completedAt: "2026-01-01T00:00:00.000Z" });
    db.reconcileSavedSearchResults(search.id, seedRun.id, "bad", [{ productId: "old", hash: "h", product: { summary: { id: "old" } } }], "2026-01-01T00:00:00.000Z");

    const first = await runSavedSearch(db, search, { fetchImpl: fetchResult("Chair", 10), now: new Date("2026-06-07T10:00:00Z") });
    expect(first.run.status).toBe("partial");
    expect(db.listSavedSearchResults(search.id).map((item) => `${item.sourceId}:${item.productId}`)).toEqual(["bad:old", "good:1"]);
    expect(db.listProducts()).toHaveLength(1);

    const emptyFetch = (async (input: string | URL | Request) => {
      if (new URL(String(input)).hostname === "bad.example") throw new Error("still unavailable");
      return Response.json({ total: 0, count: 0, offset: 0, limit: 200, items: [] });
    }) as typeof fetch;
    await runSavedSearch(db, db.savedSearch(search.id)!, { fetchImpl: emptyFetch, now: new Date("2026-06-07T11:00:00Z") });
    expect(db.listSavedSearchResults(search.id).map((item) => `${item.sourceId}:${item.productId}`)).toEqual(["bad:old"]);
    expect(db.listProducts()).toHaveLength(1);
    expect(db.listSavedSearchEvents(search.id).map((event) => event.eventType)).toContain("search_result.left");
  });

  test("runs only due enabled watched searches", async () => {
    const db = database();
    db.createSavedSearch({ name: "Due", query: "chair", sourceIds: ["good"], watched: true });
    db.createSavedSearch({ name: "Saved only", query: "chair", sourceIds: ["good"], watched: false });
    const runs = await runDueSavedSearches(db, { fetchImpl: fetchResult("Chair"), now: new Date("2099-01-01T00:00:00Z") });
    expect(runs).toHaveLength(1);
  });

  test("prevents overlapping scheduler runs", async () => {
    const db = database();
    db.createSavedSearch({ name: "Due", query: "chair", sourceIds: ["bad"], watched: true });
    const scheduler = createSearchScheduler(db, 60_000);
    const first = scheduler.runDue();
    const overlapping = await scheduler.runDue();
    expect(overlapping).toEqual([]);
    await first;
    scheduler.stop();
  });

  test("clears current membership on definition changes while retaining history", () => {
    const db = database();
    const search = db.createSavedSearch({ name: "Chairs", query: "chair", sourceIds: ["good"], watched: true });
    const run = db.recordSavedSearchRun({ searchId: search.id, status: "succeeded", resultCount: 1, sourceResults: [], startedAt: "2026-01-01T00:00:00Z", completedAt: "2026-01-01T00:00:00Z" });
    db.reconcileSavedSearchResults(search.id, run.id, "good", [{ productId: "1", hash: "h", product: { summary: { id: "1" } } }], "2026-01-01T00:00:00Z");
    db.updateSavedSearch(search.id, { name: "Tables", query: "table", sourceIds: ["good"], watched: true });
    expect(db.listSavedSearchResults(search.id)).toEqual([]);
    expect(db.listSavedSearchEvents(search.id)).toHaveLength(1);
    expect(db.listSavedSearchRuns(search.id)).toHaveLength(1);
  });
});
