import type { Octokit } from "@octokit/rest";
import { createdEvent, deletedEvent, eventRunDigest, fieldChangedEvents } from "./client-events";
import { diffJson } from "./diff";
import { branchExists, createCommitFromTree, getCommitTreeSha, getTreeFilesByPath, readBlobText, refCommitSha } from "./github";
import { safePathSegment, sha256Text, stableStringify } from "./json";
import type { AppConfig, LoadedProduct, ProductEvent, ProductStateIndex, ProductStateRecord, ProductSummary, RepoTarget, StoreConfig, StoreEventIndex, StoreManifest } from "./types";

const SHARD_SIZE = 250;
const LATEST_EVENTS_LIMIT = 1000;

export interface BrowserSyncOptions {
  ecwidToken: string;
  force?: boolean;
  maxProducts?: number;
}

export interface BrowserSyncResult {
  commitSha: string;
  branch: string;
  fetched: number;
  created: number;
  updated: number;
  deleted: number;
  fieldEvents: number;
  eventFile?: string;
  productsHash: string;
}

function isoNoMillis(date = new Date()): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function productId(product: Record<string, unknown>, storeId: string): string {
  const id = product.id;
  if (typeof id !== "string" && typeof id !== "number") throw new Error(`Product in store ${storeId} is missing string/number id`);
  return String(id);
}

function summary(product: Record<string, unknown>): ProductSummary {
  const id = productId(product, "unknown");
  const out: ProductSummary = { id };
  if (typeof product.id === "number") out.numericId = product.id;
  if (typeof product.enabled === "boolean") out.enabled = product.enabled;
  if (typeof product.sku === "string") out.sku = product.sku;
  if (typeof product.name === "string") out.name = product.name;
  if (typeof product.price === "number") out.price = product.price;
  if (typeof product.defaultDisplayedPrice === "number") out.defaultDisplayedPrice = product.defaultDisplayedPrice;
  if (typeof product.compareToPrice === "number") out.compareToPrice = product.compareToPrice;
  if (typeof product.quantity === "number") out.quantity = product.quantity;
  if (typeof product.inStock === "boolean") out.inStock = product.inStock;
  if (typeof product.url === "string") out.url = product.url;
  if (typeof product.thumbnailUrl === "string") out.thumbnailUrl = product.thumbnailUrl;
  if (typeof product.imageUrl === "string") out.imageUrl = product.imageUrl;
  if (typeof product.smallThumbnailUrl === "string") out.smallThumbnailUrl = product.smallThumbnailUrl;
  if (typeof product.hdThumbnailUrl === "string") out.hdThumbnailUrl = product.hdThumbnailUrl;
  if (Array.isArray(product.attributes)) out.attributeCount = product.attributes.length;
  if (Array.isArray(product.options)) out.optionCount = product.options.length;
  if (Array.isArray(product.galleryImages)) out.imageCount = product.galleryImages.length;
  const categories = product.categories;
  if (Array.isArray(categories)) {
    const categoryNames: string[] = [];
    const categoryIds: Array<string | number> = [];
    for (const category of categories) {
      if (!category || typeof category !== "object" || Array.isArray(category)) continue;
      const record = category as Record<string, unknown>;
      if (typeof record.name === "string") categoryNames.push(record.name);
      if (typeof record.id === "string" || typeof record.id === "number") categoryIds.push(record.id);
    }
    if (categoryNames.length) out.categoryNames = categoryNames;
    if (categoryIds.length) out.categoryIds = categoryIds;
  }
  return out;
}

async function productRecord(storeId: string, product: Record<string, unknown>): Promise<ProductStateRecord> {
  const id = productId(product, storeId);
  const canonical = stableStringify(product);
  return { storeId, productId: id, path: `products/${safePathSegment(id)}.json`, hash: await sha256Text(canonical), summary: summary(product), product };
}

async function productsHash(records: Array<{ productId: string; hash: string }>): Promise<string> {
  return sha256Text(records.map((record) => `${record.productId}\t${record.hash}`).sort().join("\n") + "\n");
}

async function fetchAllEcwidProducts(store: StoreConfig, token: string, maxProducts?: number): Promise<Record<string, unknown>[]> {
  const limit = Math.max(1, Math.min(200, Number(store.limit ?? 200)));
  const delay = Math.max(0, Number(store.requestDelayMs ?? 100));
  const baseUrl = store.apiBaseUrl ?? "https://app.ecwid.com";
  const products: Record<string, unknown>[] = [];
  let offset = 0;
  let total = Infinity;
  while (offset < total) {
    const url = new URL(`/api/v3/${encodeURIComponent(store.id)}/products`, baseUrl);
    url.searchParams.set("token", token);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));
    for (const [key, value] of Object.entries(store.extraQuery ?? {})) url.searchParams.set(key, String(value));
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Ecwid API failed at offset ${offset}: ${response.status} ${response.statusText}`);
    const page = await response.json() as { total?: number; count?: number; items?: unknown[] };
    total = typeof page.total === "number" ? page.total : products.length + (page.items?.length ?? 0);
    const items = (page.items ?? []).filter((item): item is Record<string, unknown> => !!item && typeof item === "object" && !Array.isArray(item));
    products.push(...items);
    if (typeof maxProducts === "number" && products.length >= maxProducts) return products.slice(0, maxProducts);
    if (items.length === 0) break;
    offset += limit;
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
  }
  return products;
}

function storeBranch(config: AppConfig, storeId: string): string {
  return `${config.storeBranchPrefix || "stores/ecwid"}/${safePathSegment(storeId)}`;
}

async function loadExistingProducts(octokit: Octokit, target: RepoTarget, branch: string): Promise<Map<string, ProductStateRecord>> {
  const map = new Map<string, ProductStateRecord>();
  let files;
  try { files = await getTreeFilesByPath(octokit, target, branch); }
  catch { return map; }
  const indexFile = files.get("state/products.index.json");
  if (indexFile) {
    const index = JSON.parse(await readBlobText(octokit, target, indexFile.sha)) as ProductStateIndex;
    for (const shard of index.shards) {
      const shardFile = files.get(shard.path);
      if (!shardFile) continue;
      const text = await readBlobText(octokit, target, shardFile.sha);
      for (const line of text.trim().split("\n").filter(Boolean)) {
        const record = JSON.parse(line) as ProductStateRecord;
        map.set(record.productId, record);
      }
    }
    return map;
  }
  for (const file of [...files.values()].filter((file) => file.path.startsWith("products/") && file.path.endsWith(".json")).slice(0, 2000)) {
    const product = JSON.parse(await readBlobText(octokit, target, file.sha)) as Record<string, unknown>;
    const record = await productRecord("unknown", product);
    map.set(record.productId, record);
  }
  return map;
}

function eventCounts(events: ProductEvent[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const event of events) counts[event.eventType] = (counts[event.eventType] ?? 0) + 1;
  return counts;
}

async function buildStateFiles(store: StoreConfig, observedAt: string, records: ProductStateRecord[], events: ProductEvent[], eventFile: string | undefined, previousEventIndex?: StoreEventIndex): Promise<Array<{ path: string; content: string }>> {
  const sorted = [...records].sort((a, b) => a.productId.localeCompare(b.productId));
  const productIndex: ProductStateIndex = { schemaVersion: 1, kind: "product-state-index", source: "ecwid", storeId: store.id, generatedAt: observedAt, productCount: sorted.length, productsHash: await productsHash(sorted), shardSize: SHARD_SIZE, shards: [], records: [] };
  const files: Array<{ path: string; content: string }> = [];
  for (let i = 0; i < sorted.length; i += SHARD_SIZE) {
    const shard = sorted.slice(i, i + SHARD_SIZE);
    const shardPath = `state/products/${String(productIndex.shards.length).padStart(5, "0")}.jsonl`;
    const content = shard.map((record) => JSON.stringify(record)).join("\n") + (shard.length ? "\n" : "");
    files.push({ path: shardPath, content });
    productIndex.shards.push({ path: shardPath, count: shard.length, firstProductId: shard[0]?.productId ?? null, lastProductId: shard.at(-1)?.productId ?? null, hash: await sha256Text(content) });
    for (const record of shard) productIndex.records.push({ productId: record.productId, hash: record.hash, path: record.path, shardPath, summary: record.summary });
  }
  const eventFiles = new Map<string, StoreEventIndex["files"][number]>();
  if (previousEventIndex) for (const file of previousEventIndex.files) eventFiles.set(file.path, file);
  if (eventFile && events.length) eventFiles.set(eventFile, { path: eventFile, count: events.length, firstObservedAt: events[0]?.observedAt ?? observedAt, lastObservedAt: events.at(-1)?.observedAt ?? observedAt, eventTypes: eventCounts(events), hash: await sha256Text(events.map((event) => event.eventId).join("\n") + "\n") });
  const eventFilesOrdered = [...eventFiles.values()].sort((a, b) => a.path.localeCompare(b.path));
  const eventIndex: StoreEventIndex = { schemaVersion: 1, kind: "event-state-index", source: "ecwid", storeId: store.id, generatedAt: observedAt, totalEvents: eventFilesOrdered.reduce((sum, file) => sum + file.count, 0), eventTypes: eventFilesOrdered.reduce<Record<string, number>>((acc, file) => { for (const [key, value] of Object.entries(file.eventTypes)) acc[key] = (acc[key] ?? 0) + value; return acc; }, {}), files: eventFilesOrdered };
  files.push({ path: "state/products.index.json", content: stableStringify(productIndex) });
  files.push({ path: "state/events.index.json", content: stableStringify(eventIndex) });
  files.push({ path: "state/latest-events.jsonl", content: events.slice(-LATEST_EVENTS_LIMIT).map((event) => JSON.stringify(event)).join("\n") + (events.length ? "\n" : "") });
  return files;
}

async function existingEventIndex(octokit: Octokit, target: RepoTarget, branch: string): Promise<StoreEventIndex | undefined> {
  try {
    const files = await getTreeFilesByPath(octokit, target, branch);
    const file = files.get("state/events.index.json");
    return file ? JSON.parse(await readBlobText(octokit, target, file.sha)) as StoreEventIndex : undefined;
  } catch { return undefined; }
}

async function blobEntry(octokit: Octokit, target: RepoTarget, path: string, content: string): Promise<Record<string, unknown>> {
  const { data } = await octokit.rest.git.createBlob({ owner: target.owner, repo: target.repo, content, encoding: "utf-8" });
  return { path, mode: "100644", type: "blob", sha: data.sha };
}

async function blobEntries(octokit: Octokit, target: RepoTarget, files: Array<{ path: string; content: string }>, onProgress?: (done: number, total: number) => void): Promise<Array<Record<string, unknown>>> {
  const entries: Array<Record<string, unknown>> = [];
  for (let i = 0; i < files.length; i += 1) {
    entries.push(await blobEntry(octokit, target, files[i]!.path, files[i]!.content));
    onProgress?.(i + 1, files.length);
  }
  return entries;
}

export async function browserSyncStore(octokit: Octokit, target: RepoTarget, config: AppConfig, store: StoreConfig, options: BrowserSyncOptions, onProgress?: (message: string) => void): Promise<BrowserSyncResult> {
  if (!options.ecwidToken.trim()) throw new Error("Ecwid token is required for browser-side sync because GitHub secrets cannot be read back by the web UI.");
  const branch = storeBranch(config, store.id);
  const observedAt = isoNoMillis();
  const runId = observedAt.replaceAll(/[-:]/g, "").replace("T", "-").replace("Z", "Z-web");
  onProgress?.("Checking existing store branch state");
  const exists = await branchExists(octokit, target, branch);
  const parentSha = exists ? await refCommitSha(octokit, target, branch) : undefined;
  const baseTreeSha = exists ? await getCommitTreeSha(octokit, target, branch) : undefined;
  const previous = exists ? await loadExistingProducts(octokit, target, branch) : new Map<string, ProductStateRecord>();
  const previousEventState = exists ? await existingEventIndex(octokit, target, branch) : undefined;

  onProgress?.("Fetching Ecwid products in the browser");
  const fetched = await fetchAllEcwidProducts(store, options.ecwidToken, options.maxProducts);
  const nextRecords = new Map<string, ProductStateRecord>();
  const events: ProductEvent[] = [];
  const productFiles: Array<{ path: string; content: string }> = [];
  const deletions: string[] = [];
  let created = 0, updated = 0, deleted = 0, fieldEvents = 0;

  for (const product of fetched) {
    const record = await productRecord(store.id, product);
    if (nextRecords.has(record.productId)) throw new Error(`Ecwid returned duplicate product id ${record.productId}`);
    nextRecords.set(record.productId, record);
    const old = previous.get(record.productId);
    if (!old) {
      created += 1;
      events.push(await createdEvent({ storeId: store.id, productId: record.productId, runId, observedAt }, product, record.hash));
      productFiles.push({ path: record.path, content: stableStringify(product) });
    } else if (old.hash !== record.hash) {
      updated += 1;
      const changes = diffJson(old.product, product);
      const productEvents = await fieldChangedEvents({ storeId: store.id, productId: record.productId, runId, observedAt }, changes, old.hash, record.hash);
      events.push(...productEvents);
      fieldEvents += productEvents.length;
      productFiles.push({ path: record.path, content: stableStringify(product) });
    }
  }

  for (const [productId, old] of previous) {
    if (nextRecords.has(productId)) continue;
    deleted += 1;
    deletions.push(old.path);
    events.push(await deletedEvent({ storeId: store.id, productId, runId, observedAt }, old.product, old.hash));
  }

  const records = [...nextRecords.values()].sort((a, b) => a.productId.localeCompare(b.productId));
  const productStateHash = await productsHash(records);
  let eventFile: string | undefined;
  const eventFiles: Array<{ path: string; content: string }> = [];
  if (events.length) {
    const digest = await eventRunDigest(events);
    const dayPath = observedAt.slice(0, 10).replaceAll("-", "/");
    eventFile = `events/${dayPath}/${digest}.jsonl`;
    eventFiles.push({ path: eventFile, content: events.map((event) => JSON.stringify(event)).join("\n") + "\n" });
  }

  const summary = { storeId: store.id, fetched: fetched.length, created, updated, deleted, fieldEvents, eventFile, productsHash: productStateHash };
  const manifest: StoreManifest = { schemaVersion: 2, source: "ecwid", storeId: store.id, storeName: store.name ?? null, productCount: records.length, productsHash: productStateHash, lastSyncedAt: observedAt, lastChangedAt: events.length ? observedAt : null, lastRunId: runId, lastEventFile: eventFile ?? previousEventState?.files.at(-1)?.path ?? null, syncIntervalMinutes: store.syncIntervalMinutes ?? config.defaultSyncIntervalMinutes, nextSyncNotBefore: isoNoMillis(new Date(Date.now() + (store.syncIntervalMinutes ?? config.defaultSyncIntervalMinutes) * 60_000)) };
  const stateFiles = await buildStateFiles(store, observedAt, records, events, eventFile, previousEventState);
  const fixedFiles: Array<{ path: string; content: string }> = [
    { path: "README.md", content: `# Ecwid store ${store.id}\n\nOrphan branch containing product snapshots, resolved state indexes, and append-only event streams for this store.\n` },
    { path: "config.json", content: stableStringify({ ...store, token: undefined }) },
    { path: "store.json", content: stableStringify(manifest) },
    { path: "state/run-summary.json", content: stableStringify({ schemaVersion: 1, kind: "store-run-summary", source: "ecwid", storeId: store.id, generatedAt: observedAt, summary }) }
  ];

  const removedOldStateShards: string[] = [];
  if (exists) {
    const files = await getTreeFilesByPath(octokit, target, branch);
    for (const file of files.values()) if (file.path.startsWith("state/products/") && file.path.endsWith(".jsonl") && !stateFiles.some((next) => next.path === file.path)) removedOldStateShards.push(file.path);
  }

  const filesToWrite = [...productFiles, ...eventFiles, ...stateFiles, ...fixedFiles];
  onProgress?.(`Uploading ${filesToWrite.length} blobs to GitHub`);
  const tree = await blobEntries(octokit, target, filesToWrite, (done, total) => { if (done % 25 === 0 || done === total) onProgress?.(`Uploaded ${done}/${total} blobs`); });
  for (const path of [...deletions, ...removedOldStateShards]) tree.push({ path, mode: "100644", type: "blob", sha: null });
  const msg = events.length ? `sync(ecwid:${store.id}): browser sync ${created} created, ${updated} updated, ${deleted} deleted` : `sync(ecwid:${store.id}): browser refresh metadata`;
  onProgress?.("Creating Git commit");
  const commitSha = await createCommitFromTree(octokit, target, { branch, message: msg, baseTreeSha, parentSha, tree });
  return { commitSha, branch, fetched: fetched.length, created, updated, deleted, fieldEvents, eventFile, productsHash: productStateHash };
}

export async function loadStoreStateProducts(octokit: Octokit, target: RepoTarget, branch: string): Promise<LoadedProduct[]> {
  const files = await getTreeFilesByPath(octokit, target, branch);
  const indexFile = files.get("state/products.index.json");
  if (!indexFile) return [];
  const index = JSON.parse(await readBlobText(octokit, target, indexFile.sha)) as ProductStateIndex;
  const loaded: LoadedProduct[] = [];
  for (const shard of index.shards) {
    const file = files.get(shard.path);
    if (!file) continue;
    const text = await readBlobText(octokit, target, file.sha);
    for (const line of text.trim().split("\n").filter(Boolean)) {
      const record = JSON.parse(line) as ProductStateRecord;
      loaded.push({ storeId: record.storeId, path: record.path, hash: record.hash, summary: record.summary, product: record.product });
    }
  }
  return loaded;
}
