import { stableStringify, sha256Text } from "../shared/canonical-json.ts";
import { createdEvent, fieldChangedEvents } from "../shared/events.ts";
import { diffJson } from "../shared/json-diff.ts";
import { OperationsDatabase, type SavedSearch } from "./operations/database.ts";
import { offeringRawProduct } from "./sources/canonical.ts";
import { createReadOnlyHttpClient } from "./sources/read-only-http.ts";
import { sourceAdapterForStore } from "./sources/registry.ts";
import type { ProductOfferingInput } from "./sources/types.ts";
import type { JsonObject, StoreConfig } from "../shared/types.ts";

export interface SourceSearchResult {
  sourceId: string;
  status: "succeeded" | "failed";
  count: number;
  products: ProductOfferingInput[];
  error?: string;
}

export interface MultiSourceSearchResult {
  query: string;
  sources: SourceSearchResult[];
  products: ProductOfferingInput[];
}

export interface SearchRunnerOptions {
  fetchImpl?: typeof fetch;
  now?: Date;
  cwd?: string;
}

function dbProduct(product: ProductOfferingInput): JsonObject {
  const raw = offeringRawProduct(product);
  return {
    summary: {
      id: product.externalId,
      name: product.title,
      price: product.price,
      compareToPrice: product.compareAtPrice,
      inStock: product.availability !== "unavailable",
      url: product.url,
      imageUrl: product.imageUrls[0],
      categoryNames: product.categories
    },
    product: raw
  } as JsonObject;
}

export async function searchSources(
  stores: StoreConfig[],
  input: { query: string; sourceIds: string[] },
  options: SearchRunnerOptions = {}
): Promise<MultiSourceSearchResult> {
  const query = input.query.trim();
  if (!query) throw new Error("query must be a non-empty string");
  if (!input.sourceIds.length) throw new Error("sourceIds must contain at least one source");
  const byId = new Map(stores.map((store) => [store.id, store]));
  const http = createReadOnlyHttpClient(options.fetchImpl);
  const sources: SourceSearchResult[] = [];
  for (const sourceId of [...new Set(input.sourceIds)]) {
    const store = byId.get(sourceId);
    if (!store) {
      sources.push({ sourceId, status: "failed", count: 0, products: [], error: `Unknown source ${sourceId}` });
      continue;
    }
    try {
      const adapter = sourceAdapterForStore(store, options.cwd);
      if (!adapter.searchProducts) throw new Error(`Source ${sourceId} does not support direct search`);
      const products: ProductOfferingInput[] = [];
      for await (const chunk of adapter.searchProducts(store as never, { query }, { http })) products.push(...chunk);
      sources.push({ sourceId, status: "succeeded", count: products.length, products });
    } catch (error) {
      sources.push({ sourceId, status: "failed", count: 0, products: [], error: (error as Error).message });
    }
  }
  return { query, sources, products: sources.flatMap((source) => source.products) };
}

function upsertWatchedProducts(db: OperationsDatabase, products: ProductOfferingInput[], runId: string, observedAt: string): void {
  for (const product of products) {
    const next = dbProduct(product);
    const canonical = stableStringify(next);
    const hash = sha256Text(canonical);
    const previous = db.getProduct(product.sourceId, product.externalId);
    db.upsertProduct(product.sourceId, product.externalId, hash, next);
    if (!previous) {
      db.insertEvents([createdEvent({ storeId: product.sourceId, productId: product.externalId, runId, observedAt }, next, hash)]);
    } else if (previous.hash !== hash) {
      db.insertEvents(fieldChangedEvents(
        { storeId: product.sourceId, productId: product.externalId, runId, observedAt },
        diffJson(previous.product, next),
        previous.hash,
        hash
      ));
    }
  }
}

export async function runSavedSearch(db: OperationsDatabase, search: SavedSearch, options: SearchRunnerOptions = {}) {
  const startedAt = (options.now ?? new Date()).toISOString();
  const result = await searchSources(db.listStores(), { query: search.query, sourceIds: search.sourceIds }, options);
  const completedAt = (options.now ?? new Date()).toISOString();
  const failures = result.sources.filter((source) => source.status === "failed").length;
  const hadCurrentResults = search.watched && db.listSavedSearchResults(search.id).length > 0;
  const emptyWatchedRun = search.watched && !hadCurrentResults && result.products.length === 0 && result.sources.every((source) => source.count === 0);
  const status = failures === result.sources.length || emptyWatchedRun ? "failed" : failures === 0 ? "succeeded" : "partial";
  const run = db.recordSavedSearchRun({
    searchId: search.id,
    status,
    resultCount: result.products.length,
    sourceResults: result.sources.map(({ products, ...source }) => source),
    startedAt,
    completedAt
  });
  if (search.watched) {
    const productRunId = `search-${search.id}-${run.id}`;
    upsertWatchedProducts(db, result.products, productRunId, completedAt);
    for (const source of result.sources) {
      if (source.status !== "succeeded") continue;
      db.reconcileSavedSearchResults(search.id, run.id, source.sourceId, source.products.map((product) => {
        const stored = dbProduct(product);
        return { productId: product.externalId, hash: sha256Text(stableStringify(stored)), product: stored };
      }), completedAt);
    }
  }
  return { search: db.savedSearch(search.id), run, ...result };
}

export async function runDueSavedSearches(db: OperationsDatabase, options: SearchRunnerOptions = {}) {
  const results = [];
  for (const search of db.listDueSavedSearches(options.now)) results.push(await runSavedSearch(db, search, options));
  return results;
}

export function createSearchScheduler(db: OperationsDatabase, intervalMs = 60_000) {
  let running = false;
  const runDue = async () => {
    if (running) return [];
    running = true;
    try {
      return await runDueSavedSearches(db);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => void runDue(), intervalMs);
  timer.unref?.();
  return { runDue, stop: () => clearInterval(timer) };
}
