import { stableStringify, sha256Text } from "../shared/canonical-json.ts";
import type { FetchAllProductsOptions } from "./ecwid.ts";
import { createdEvent, deletedEvent, fieldChangedEvents } from "../shared/events.ts";
import { diffJson } from "../shared/json-diff.ts";
import { createReadOnlyHttpClient } from "./sources/read-only-http.ts";
import { sourceAdapterForStore } from "./sources/registry.ts";
import type { SourceKind } from "./sources/types.ts";
import type { AppConfig, JsonObject, ProductEvent, StoreConfig, StoreSyncSummary, SyncSummary } from "../shared/types.ts";
import { OperationsDatabase } from "./operations/database.ts";

export interface SyncStoresOptions extends FetchAllProductsOptions {
  cwd?: string;
  now?: Date;
  db?: OperationsDatabase;
}

function isoNoMillis(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function storeProductsHash(records: Array<{ productId: string; hash: string }>): string {
  const lines = records
    .map((record) => `${record.productId}\t${record.hash}`)
    .sort((a, b) => a.localeCompare(b))
    .join("\n");
  return sha256Text(`${lines}\n`);
}

export type SyncProgressMessage = 
  | { type: 'progress'; storeId: string; fetched: number; status: string }
  | { type: 'summary'; summary: StoreSyncSummary };

export async function* syncStoreStream(
  config: AppConfig,
  store: StoreConfig,
  runId: string,
  observedAt: string,
  options: SyncStoresOptions,
  db: OperationsDatabase
): AsyncGenerator<SyncProgressMessage, StoreSyncSummary, unknown> {
  const existing = db.listStoreProducts(store.id);
  const existingMap = new Map(existing.map(p => [p.productId, p]));
  
  const adapter = sourceAdapterForStore(store, options.cwd);
  const fetchStream = (adapter as any).fetchProducts({ ...store, fetchOptions: options }, {
    http: createReadOnlyHttpClient(options.fetchImpl)
  });
  
  const seen = new Set<string>();
  const nextRecords: Array<{ productId: string; hash: string }> = [];
  
  let fetchedCount = 0;
  let created = 0;
  let updated = 0;
  let deleted = 0;
  let fieldEvents = 0;

  yield { type: 'progress', storeId: store.id, fetched: 0, status: 'starting' };

  for await (const chunk of fetchStream) {
    const chunkEvents: ProductEvent[] = [];
    for (const offering of chunk as any[]) {
      const id = offering.externalId;
      if (seen.has(id)) throw new Error(`${adapter.kind} returned duplicate product id ${id} for store ${store.id}`);
      seen.add(id);

      const summary = {
        id: offering.externalId,
        name: offering.title,
        price: offering.price,
        compareToPrice: offering.compareAtPrice,
        inStock: offering.availability !== "unavailable",
        url: offering.url,
        imageUrl: offering.imageUrls[0],
        categoryNames: offering.categories
      };
      
      const dbProduct = { summary, product: offering.raw } as JsonObject;
      const offeringString = stableStringify(dbProduct);
      const hash = sha256Text(offeringString);
      const previous = existingMap.get(id);

      nextRecords.push({ productId: id, hash });

      if (!previous) {
        db.upsertProduct(store.id, id, hash, dbProduct);
        chunkEvents.push(createdEvent({ storeId: store.id, productId: id, runId, observedAt }, dbProduct, hash));
        created += 1;
        continue;
      }

      if (previous.hash !== hash) {
        db.upsertProduct(store.id, id, hash, dbProduct);
        // Only diff the summary to avoid massive events and because we only load summaries into memory
        const changes = diffJson(previous.product, summary as unknown as JsonObject);
        const productEvents = fieldChangedEvents(
          { storeId: store.id, productId: id, runId, observedAt },
          changes,
          previous.hash,
          hash
        );
        chunkEvents.push(...productEvents);
        updated += 1;
        fieldEvents += productEvents.length;
      }
    }
    
    db.insertEvents(chunkEvents);
    fetchedCount += chunk.length;
    yield { type: 'progress', storeId: store.id, fetched: fetchedCount, status: 'fetching' };
  }

  const deleteEvents: ProductEvent[] = [];
  for (const [id, previous] of [...existingMap.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (seen.has(id)) continue;
    db.deleteProduct(store.id, id);
    deleteEvents.push(deletedEvent({ storeId: store.id, productId: id, runId, observedAt }, previous.product, previous.hash));
    deleted += 1;
  }
  db.insertEvents(deleteEvents);
  
  const productsHash = storeProductsHash(nextRecords);

  const summary: StoreSyncSummary = {
    storeId: store.id,
    fetched: fetchedCount,
    created,
    updated,
    deleted,
    fieldEvents,
    productsHash
  };
  
  yield { type: 'summary', summary };
  return summary;
}

async function syncStore(
  config: AppConfig,
  store: StoreConfig,
  runId: string,
  observedAt: string,
  options: SyncStoresOptions,
  db: OperationsDatabase
): Promise<StoreSyncSummary> {
  let finalSummary: StoreSyncSummary | undefined;
  for await (const message of syncStoreStream(config, store, runId, observedAt, options, db)) {
    if (message.type === 'summary') {
      finalSummary = message.summary;
    }
  }
  return finalSummary!;
}

export async function syncStores(config: AppConfig, options: SyncStoresOptions = {}): Promise<SyncSummary> {
  const now = options.now ?? new Date();
  const observedAt = isoNoMillis(now);
  const runId = observedAt.replaceAll(/[-:]/g, "").replace("T", "-").replace("Z", "Z");
  
  const db = options.db ?? new OperationsDatabase();

  const enabledStores = config.stores.filter((store) => store.enabled !== false);
  const summaries: StoreSyncSummary[] = [];

  for (const store of enabledStores) {
    summaries.push(await syncStore(config, store, runId, observedAt, options, db));
  }

  const summary: SyncSummary = { runId, observedAt, stores: summaries };
  
  if (!options.db) {
    db.close();
  }
  
  return summary;
}
