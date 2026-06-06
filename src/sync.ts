import { mkdir, readdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { stableStringify, sha256Text } from "./canonical-json.ts";
import { fetchAllProducts, type FetchAllProductsOptions } from "./ecwid.ts";
import { eventJsonl, eventRunDigest, createdEvent, deletedEvent, fieldChangedEvents } from "./events.ts";
import { diffJson } from "./json-diff.ts";
import { safePathSegment } from "./safe-id.ts";
import type { AppConfig, JsonObject, ProductEvent, ProductSnapshotRecord, StoreConfig, StoreSyncSummary, SyncSummary } from "./types.ts";

export interface SyncStoresOptions extends FetchAllProductsOptions {
  cwd?: string;
  now?: Date;
}

function isoNoMillis(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function productId(product: JsonObject, storeId: string): string {
  const id = product.id;
  if (typeof id !== "string" && typeof id !== "number") {
    throw new Error(`Product in store ${storeId} is missing string/number id`);
  }
  return String(id);
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await readFile(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

async function readExistingProducts(productsDir: string): Promise<Map<string, ProductSnapshotRecord>> {
  const records = new Map<string, ProductSnapshotRecord>();

  let entries: string[] = [];
  try {
    entries = await readdir(productsDir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return records;
    throw error;
  }

  for (const entry of entries.sort()) {
    if (!entry.endsWith(".json")) continue;
    const filePath = path.join(productsDir, entry);
    const raw = await readFile(filePath, "utf8");
    const product = JSON.parse(raw) as JsonObject;
    const idValue = product.id;
    const id = typeof idValue === "string" || typeof idValue === "number" ? String(idValue) : entry.replace(/\.json$/, "");
    const canonical = stableStringify(product);
    records.set(id, {
      productId: id,
      filePath,
      product,
      canonical,
      hash: sha256Text(canonical)
    });
  }

  return records;
}

function storeProductsHash(records: Array<{ productId: string; hash: string }>): string {
  const lines = records
    .map((record) => `${record.productId}\t${record.hash}`)
    .sort()
    .join("\n");
  return sha256Text(`${lines}\n`);
}

async function writeStoreManifest(params: {
  store: StoreConfig;
  storeDir: string;
  observedAt: string;
  runId: string;
  productCount: number;
  productsHash: string;
  eventFile?: string;
}): Promise<void> {
  const manifestPath = path.join(params.storeDir, "store.json");
  const manifest = {
    schemaVersion: 1,
    source: "ecwid",
    storeId: params.store.id,
    storeName: params.store.name ?? null,
    productCount: params.productCount,
    productsHash: params.productsHash,
    lastChangedAt: params.observedAt,
    lastChangedRunId: params.runId,
    lastEventFile: params.eventFile ?? null
  };
  await writeFile(manifestPath, stableStringify(manifest as never), "utf8");
}

async function syncStore(
  config: AppConfig,
  store: StoreConfig,
  root: string,
  runId: string,
  observedAt: string,
  options: SyncStoresOptions
): Promise<StoreSyncSummary> {
  const storeDir = path.join(root, config.productsRoot, safePathSegment(store.id));
  const productsDir = path.join(storeDir, "products");
  await mkdir(productsDir, { recursive: true });

  const existing = await readExistingProducts(productsDir);
  const fetched = await fetchAllProducts(store, options);
  const seen = new Set<string>();
  const nextRecords: Array<{ productId: string; hash: string }> = [];
  const events: ProductEvent[] = [];
  let created = 0;
  let updated = 0;
  let deleted = 0;
  let fieldEvents = 0;

  for (const product of fetched) {
    const id = productId(product, store.id);
    if (seen.has(id)) throw new Error(`Ecwid returned duplicate product id ${id} for store ${store.id}`);
    seen.add(id);

    const filePath = path.join(productsDir, `${safePathSegment(id)}.json`);
    const canonical = stableStringify(product);
    const hash = sha256Text(canonical);
    const previous = existing.get(id);

    nextRecords.push({ productId: id, hash });

    if (!previous) {
      await writeFile(filePath, canonical, "utf8");
      events.push(createdEvent({ storeId: store.id, productId: id, runId, observedAt }, product, hash));
      created += 1;
      continue;
    }

    if (previous.hash !== hash) {
      await writeFile(filePath, canonical, "utf8");
      const changes = diffJson(previous.product, product);
      const productEvents = fieldChangedEvents(
        { storeId: store.id, productId: id, runId, observedAt },
        changes,
        previous.hash,
        hash
      );
      events.push(...productEvents);
      updated += 1;
      fieldEvents += productEvents.length;
    }
  }

  for (const [id, previous] of [...existing.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (seen.has(id)) continue;
    await unlink(previous.filePath);
    events.push(deletedEvent({ storeId: store.id, productId: id, runId, observedAt }, previous.product, previous.hash));
    deleted += 1;
  }

  const productsHash = storeProductsHash(nextRecords);
  let eventFile: string | undefined;

  if (events.length > 0) {
    const digest = eventRunDigest(events);
    const dayPath = observedAt.slice(0, 10).replaceAll("-", "/");
    const eventDir = path.join(root, config.eventsRoot, safePathSegment(store.id), dayPath);
    eventFile = path.join(config.eventsRoot, safePathSegment(store.id), dayPath, `${digest}.jsonl`);
    await mkdir(eventDir, { recursive: true });
    await writeFile(path.join(eventDir, `${digest}.jsonl`), eventJsonl(events), "utf8");
    await writeStoreManifest({
      store,
      storeDir,
      observedAt,
      runId,
      productCount: nextRecords.length,
      productsHash,
      eventFile
    });
  } else if (!(await pathExists(path.join(storeDir, "store.json")))) {
    await writeStoreManifest({
      store,
      storeDir,
      observedAt,
      runId,
      productCount: nextRecords.length,
      productsHash
    });
  }

  return {
    storeId: store.id,
    fetched: fetched.length,
    created,
    updated,
    deleted,
    fieldEvents,
    eventFile,
    productsHash
  };
}

export async function syncStores(config: AppConfig, options: SyncStoresOptions = {}): Promise<SyncSummary> {
  const root = path.resolve(options.cwd ?? process.cwd());
  const now = options.now ?? new Date();
  const observedAt = isoNoMillis(now);
  const runId = observedAt.replaceAll(/[-:]/g, "").replace("T", "-").replace("Z", "Z");
  await rm(path.join(root, config.eventsRoot), { recursive: true, force: true });

  const enabledStores = config.stores.filter((store) => store.enabled !== false);
  const summaries: StoreSyncSummary[] = [];

  for (const store of enabledStores) {
    summaries.push(await syncStore(config, store, root, runId, observedAt, options));
  }

  const summary: SyncSummary = { runId, observedAt, stores: summaries };
  const summaryPath = path.join(root, ".ecwid-sync", "summary.json");
  await mkdir(path.dirname(summaryPath), { recursive: true });
  await writeFile(summaryPath, stableStringify(summary as never), "utf8");
  return summary;
}
