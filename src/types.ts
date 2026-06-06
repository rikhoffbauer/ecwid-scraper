export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export interface StoreWebhookConfig {
  id: string;
  url: string;
  enabled?: boolean;
  events?: ProductEventType[] | ["*"];
  secretEnv?: string;
  headers?: Record<string, string>;
}

export interface StoreConfig {
  id: string;
  name?: string;
  url?: string;
  enabled?: boolean;
  token?: string;
  tokenEnv?: string;
  apiBaseUrl?: string;
  limit?: number;
  requestDelayMs?: number;
  syncIntervalMinutes?: number;
  extraQuery?: Record<string, string | number | boolean>;
  webhooks?: StoreWebhookConfig[];
}

export interface AppConfig {
  productsRoot: string;
  eventsRoot: string;
  eventBranchPrefix: string;
  storeBranchPrefix?: string;
  defaultSyncIntervalMinutes?: number;
  stores: StoreConfig[];
}

export interface EcwidProductsPage {
  total: number;
  count: number;
  offset: number;
  limit: number;
  items: JsonObject[];
}

export type ProductEventType = "product.created" | "product.deleted" | "product.field_changed";

export interface ProductEventBase {
  eventId: string;
  eventType: ProductEventType;
  schemaVersion: 1;
  source: "ecwid";
  storeId: string;
  productId: string;
  runId: string;
  observedAt: string;
  previousHash?: string;
  currentHash?: string;
}

export interface ProductCreatedEvent extends ProductEventBase {
  eventType: "product.created";
  product: JsonObject;
  currentHash: string;
}

export interface ProductDeletedEvent extends ProductEventBase {
  eventType: "product.deleted";
  product: JsonObject;
  previousHash: string;
}

export interface ProductFieldChangedEvent extends ProductEventBase {
  eventType: "product.field_changed";
  op: "add" | "remove" | "replace";
  path: string;
  before?: JsonValue;
  after?: JsonValue;
  previousHash: string;
  currentHash: string;
}

export type ProductEvent = ProductCreatedEvent | ProductDeletedEvent | ProductFieldChangedEvent;

export interface ProductSnapshotRecord {
  productId: string;
  filePath: string;
  product: JsonObject;
  canonical: string;
  hash: string;
}

export interface StoreSyncSummary {
  storeId: string;
  fetched: number;
  created: number;
  updated: number;
  deleted: number;
  fieldEvents: number;
  eventFile?: string;
  eventFiles?: string[];
  productsHash: string;
}

export interface SyncSummary {
  runId: string;
  observedAt: string;
  stores: StoreSyncSummary[];
}

export interface ProductSummary {
  id: string;
  numericId?: number;
  enabled?: boolean;
  sku?: string;
  name?: string;
  price?: number;
  defaultDisplayedPrice?: number;
  compareToPrice?: number;
  quantity?: number;
  inStock?: boolean;
  url?: string;
  thumbnailUrl?: string;
  categoryIds?: Array<string | number>;
  categoryNames?: string[];
}

export interface ProductStateRecord {
  storeId: string;
  productId: string;
  hash: string;
  path: string;
  summary: ProductSummary;
  product: JsonObject;
}

export interface ProductStateIndexRecord {
  productId: string;
  hash: string;
  path: string;
  shardPath: string;
  summary: ProductSummary;
}

export interface ProductStateIndex {
  schemaVersion: 1;
  kind: "product-state-index";
  source: "ecwid";
  storeId: string;
  generatedAt: string;
  productCount: number;
  productsHash: string;
  shardSize: number;
  shards: Array<{
    path: string;
    count: number;
    firstProductId: string | null;
    lastProductId: string | null;
    hash: string;
  }>;
  records: ProductStateIndexRecord[];
}

export interface StoreEventIndex {
  schemaVersion: 1;
  kind: "event-state-index";
  source: "ecwid";
  storeId: string;
  generatedAt: string;
  totalEvents: number;
  eventTypes: Record<string, number>;
  files: Array<{
    path: string;
    count: number;
    firstObservedAt: string;
    lastObservedAt: string;
    eventTypes: Record<string, number>;
    hash: string;
  }>;
}

export type ProductMutationOperation =
  | { op: "upsert"; productId: string; product: JsonObject; expectHash?: string }
  | { op: "delete"; productId: string; expectHash?: string };

export interface ProductMutationBatch {
  schemaVersion: 1;
  kind: "ecwid-product-mutation-batch";
  source: string;
  requestId: string;
  storeId: string;
  requestedAt: string;
  requestedBy?: string;
  baseProductsHash?: string;
  allowOutdatedBase?: boolean;
  note?: string;
  operations: ProductMutationOperation[];
}
