import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { stableStringify, sha256Text } from "./canonical-json.ts";
import { safePathSegment } from "./safe-id.ts";
import type { JsonObject, JsonValue, ProductEvent, ProductStateIndex, ProductStateRecord, ProductSummary, StoreConfig, StoreEventIndex, StoreSyncSummary } from "./types.ts";

const PRODUCT_STATE_SHARD_SIZE = 1000;
const LATEST_EVENTS_LIMIT = 1000;

function isObject(value: JsonValue | undefined): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stringField(product: JsonObject, key: string): string | undefined {
  const value = product[key];
  return typeof value === "string" ? value : undefined;
}

function numberField(product: JsonObject, key: string): number | undefined {
  const value = product[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function booleanField(product: JsonObject, key: string): boolean | undefined {
  const value = product[key];
  return typeof value === "boolean" ? value : undefined;
}

function categorySummary(product: JsonObject): { categoryIds?: Array<string | number>; categoryNames?: string[] } {
  const categories = product.categories;
  if (!Array.isArray(categories)) return {};
  const categoryIds: Array<string | number> = [];
  const categoryNames: string[] = [];
  for (const category of categories) {
    if (!isObject(category)) continue;
    const id = category.id;
    if (typeof id === "string" || typeof id === "number") categoryIds.push(id);
    const name = category.name;
    if (typeof name === "string") categoryNames.push(name);
  }
  return {
    ...(categoryIds.length ? { categoryIds } : {}),
    ...(categoryNames.length ? { categoryNames } : {})
  };
}

export function summarizeProduct(product: JsonObject): ProductSummary {
  const rawId = product.id;
  const id = typeof rawId === "string" || typeof rawId === "number" ? String(rawId) : "";
  return {
    id,
    ...(typeof rawId === "number" ? { numericId: rawId } : {}),
    ...(booleanField(product, "enabled") !== undefined ? { enabled: booleanField(product, "enabled") } : {}),
    ...(stringField(product, "sku") ? { sku: stringField(product, "sku") } : {}),
    ...(stringField(product, "name") ? { name: stringField(product, "name") } : {}),
    ...(numberField(product, "price") !== undefined ? { price: numberField(product, "price") } : {}),
    ...(numberField(product, "defaultDisplayedPrice") !== undefined ? { defaultDisplayedPrice: numberField(product, "defaultDisplayedPrice") } : {}),
    ...(numberField(product, "compareToPrice") !== undefined ? { compareToPrice: numberField(product, "compareToPrice") } : {}),
    ...(numberField(product, "quantity") !== undefined ? { quantity: numberField(product, "quantity") } : {}),
    ...(booleanField(product, "inStock") !== undefined ? { inStock: booleanField(product, "inStock") } : {}),
    ...(stringField(product, "url") ? { url: stringField(product, "url") } : {}),
    ...(stringField(product, "thumbnailUrl") ? { thumbnailUrl: stringField(product, "thumbnailUrl") } : {}),
    ...categorySummary(product)
  };
}

async function listJsonlFiles(root: string): Promise<string[]> {
  async function walk(dir: string): Promise<string[]> {
    let entries: string[] = [];
    try {
      entries = await readdir(dir);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
    const files: string[] = [];
    for (const entry of entries.sort()) {
      const absolute = path.join(dir, entry);
      const relative = path.relative(root, absolute).replaceAll(path.sep, "/");
      const statPath = absolute;
      const stat = await Bun.file(statPath).exists();
      if (!stat) continue;
      try {
        const children = await readdir(absolute);
        if (children.length >= 0) files.push(...await walk(absolute));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOTDIR") throw error;
        if (entry.endsWith(".jsonl")) files.push(relative);
      }
    }
    return files;
  }
  return walk(root);
}

function countEventTypes(events: ProductEvent[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const event of events) counts[event.eventType] = (counts[event.eventType] ?? 0) + 1;
  return counts;
}

function mergeCounts(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  const out = { ...a };
  for (const [key, value] of Object.entries(b)) out[key] = (out[key] ?? 0) + value;
  return out;
}

async function readEventIndex(worktreeDir: string): Promise<StoreEventIndex | null> {
  try {
    return JSON.parse(await readFile(path.join(worktreeDir, "state/events.index.json"), "utf8")) as StoreEventIndex;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function buildEventIndex(worktreeDir: string, storeId: string, generatedAt: string, newEventFile: string | undefined, newEvents: ProductEvent[]): Promise<StoreEventIndex> {
  const previous = await readEventIndex(worktreeDir);
  const files = new Map<string, StoreEventIndex["files"][number]>();
  if (previous) for (const file of previous.files) files.set(file.path, file);

  if (newEventFile && newEvents.length > 0) {
    files.set(newEventFile, {
      path: newEventFile,
      count: newEvents.length,
      firstObservedAt: newEvents[0]?.observedAt ?? generatedAt,
      lastObservedAt: newEvents.at(-1)?.observedAt ?? generatedAt,
      eventTypes: countEventTypes(newEvents),
      hash: sha256Text(newEvents.map((event) => event.eventId).join("\n") + "\n")
    });
  }

  if (!previous && files.size === 0) {
    const eventRoot = path.join(worktreeDir, "events");
    for (const relative of await listJsonlFiles(eventRoot)) {
      const eventPath = `events/${relative}`;
      const text = await readFile(path.join(worktreeDir, eventPath), "utf8");
      const parsed = text.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line) as ProductEvent);
      if (parsed.length === 0) continue;
      files.set(eventPath, {
        path: eventPath,
        count: parsed.length,
        firstObservedAt: parsed[0]?.observedAt ?? generatedAt,
        lastObservedAt: parsed.at(-1)?.observedAt ?? generatedAt,
        eventTypes: countEventTypes(parsed),
        hash: sha256Text(parsed.map((event) => event.eventId).join("\n") + "\n")
      });
    }
  }

  const ordered = [...files.values()].sort((a, b) => a.path.localeCompare(b.path));
  const eventTypes = ordered.reduce<Record<string, number>>((acc, file) => mergeCounts(acc, file.eventTypes), {});
  return {
    schemaVersion: 1,
    kind: "event-state-index",
    source: "ecwid",
    storeId,
    generatedAt,
    totalEvents: ordered.reduce((sum, file) => sum + file.count, 0),
    eventTypes,
    files: ordered
  };
}

export function productStateRecords(storeId: string, products: JsonObject[]): ProductStateRecord[] {
  return products.map((product) => {
    const summary = summarizeProduct(product);
    if (!summary.id) throw new Error(`Product in store ${storeId} is missing string/number id`);
    const canonical = stableStringify(product);
    const hash = sha256Text(canonical);
    return {
      storeId,
      productId: summary.id,
      hash,
      path: `products/${safePathSegment(summary.id)}.json`,
      summary,
      product
    };
  }).sort((a, b) => a.productId.localeCompare(b.productId));
}

export function productsHashFromRecords(records: Array<{ productId: string; hash: string }>): string {
  return sha256Text(records.map((r) => `${r.productId}\t${r.hash}`).sort().join("\n") + "\n");
}

export async function writeResolvedStoreState(params: {
  worktreeDir: string;
  store: StoreConfig;
  observedAt: string;
  fetchedProducts: JsonObject[];
  events: ProductEvent[];
  eventFile?: string;
  summary: StoreSyncSummary;
}): Promise<{ productIndex: ProductStateIndex; eventIndex: StoreEventIndex }> {
  const { worktreeDir, store, observedAt, fetchedProducts, events, eventFile, summary } = params;
  const stateDir = path.join(worktreeDir, "state");
  const shardDir = path.join(stateDir, "products");
  await rm(shardDir, { recursive: true, force: true });
  await mkdir(shardDir, { recursive: true });

  const records = productStateRecords(store.id, fetchedProducts);
  const shards: ProductStateIndex["shards"] = [];
  const indexRecords: ProductStateIndex["records"] = [];

  for (let i = 0; i < records.length; i += PRODUCT_STATE_SHARD_SIZE) {
    const shardRecords = records.slice(i, i + PRODUCT_STATE_SHARD_SIZE);
    const shardNumber = String(shards.length).padStart(5, "0");
    const shardPath = `state/products/${shardNumber}.jsonl`;
    const jsonl = shardRecords.map((record) => JSON.stringify(record)).join("\n") + (shardRecords.length ? "\n" : "");
    await writeFile(path.join(worktreeDir, shardPath), jsonl, "utf8");
    shards.push({
      path: shardPath,
      count: shardRecords.length,
      firstProductId: shardRecords[0]?.productId ?? null,
      lastProductId: shardRecords.at(-1)?.productId ?? null,
      hash: sha256Text(jsonl)
    });
    for (const record of shardRecords) {
      indexRecords.push({ productId: record.productId, hash: record.hash, path: record.path, shardPath, summary: record.summary });
    }
  }

  const productIndex: ProductStateIndex = {
    schemaVersion: 1,
    kind: "product-state-index",
    source: "ecwid",
    storeId: store.id,
    generatedAt: observedAt,
    productCount: records.length,
    productsHash: productsHashFromRecords(records),
    shardSize: PRODUCT_STATE_SHARD_SIZE,
    shards,
    records: indexRecords
  };

  const eventIndex = await buildEventIndex(worktreeDir, store.id, observedAt, eventFile, events);
  const latestEvents = events.slice(-LATEST_EVENTS_LIMIT);

  await writeFile(path.join(stateDir, "products.index.json"), stableStringify(productIndex as never), "utf8");
  await writeFile(path.join(stateDir, "events.index.json"), stableStringify(eventIndex as never), "utf8");
  await writeFile(path.join(stateDir, "latest-events.jsonl"), latestEvents.map((event) => JSON.stringify(event)).join("\n") + (latestEvents.length ? "\n" : ""), "utf8");
  await writeFile(path.join(stateDir, "run-summary.json"), stableStringify({ schemaVersion: 1, kind: "store-run-summary", source: "ecwid", storeId: store.id, generatedAt: observedAt, summary } as never), "utf8");

  return { productIndex, eventIndex };
}
