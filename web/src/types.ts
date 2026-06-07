export type ProductEventType = "product.created" | "product.deleted" | "product.field_changed";

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
  kind?: string;
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
  $schema?: string;
  defaultSyncIntervalMinutes: number;
  stores: StoreConfig[];
}

export interface StoreManifest {
  schemaVersion: number;
  source: "ecwid";
  storeId: string;
  storeName: string | null;
  productCount: number;
  productsHash: string;
  lastSyncedAt?: string;
  lastChangedAt?: string | null;
  lastRunId?: string;
  lastChangedRunId?: string;
  lastEventFile: string | null;
  syncIntervalMinutes?: number;
  nextSyncNotBefore?: string;
}

export interface ProductEvent {
  eventId: string;
  eventType: ProductEventType;
  schemaVersion: number;
  source: "ecwid";
  storeId: string;
  productId: string;
  runId: string;
  observedAt: string;
  previousHash?: string;
  currentHash?: string;
  product?: unknown;
  op?: "add" | "remove" | "replace";
  path?: string;
  before?: unknown;
  after?: unknown;
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
  imageUrl?: string;
  smallThumbnailUrl?: string;
  hdThumbnailUrl?: string;
  categoryIds?: Array<string | number>;
  attributeCount?: number;
  optionCount?: number;
  imageCount?: number;
  categoryNames?: string[];
}

export interface ProductStateRecord {
  storeId: string;
  productId: string;
  hash: string;
  path: string;
  summary: ProductSummary;
  product: Record<string, unknown>;
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
  shards: Array<{ path: string; count: number; firstProductId: string | null; lastProductId: string | null; hash: string }>;
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
  files: Array<{ path: string; count: number; firstObservedAt: string; lastObservedAt: string; eventTypes: Record<string, number>; hash: string }>;
}

export interface RepoTarget {
  owner: string;
  repo: string;
  branch: string;
}

export interface TreeFile {
  path: string;
  sha: string;
  size?: number;
  url?: string;
}

export interface RepoSecretSummary {
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface LoadedProduct {
  storeId: string;
  path: string;
  hash?: string;
  summary: ProductSummary;
  product: Record<string, unknown>;
}

export interface ProductCluster {
  id: string;
  label: string;
  products: LoadedProduct[];
  tokenSignature: string;
  confidence: number;
  medianPrice?: number;
  minPrice?: number;
  maxPrice?: number;
  avgPrice?: number;
  storeIds: string[];
}

export interface PriceIndexRow {
  storeId: string;
  comparedProducts: number;
  medianRelativePrice: number;
  averageRelativePrice: number;
  minRelativePrice: number;
  maxRelativePrice: number;
}

export interface DealCandidate {
  storeId: string;
  productId: string;
  name: string;
  price: number;
  clusterMedianPrice: number;
  relativePrice: number;
  clusterSize: number;
  url?: string;
}

export interface AnalysisSnapshot {
  schemaVersion: 1;
  generatedAt: string;
  productCount: number;
  storeCount: number;
  clusterCount: number;
  multiStoreClusterCount: number;
  priceIndex: PriceIndexRow[];
  dealCandidates: DealCandidate[];
  clusters: Array<{
    id: string;
    label: string;
    productCount: number;
    storeIds: string[];
    medianPrice?: number;
    minPrice?: number;
    maxPrice?: number;
    avgPrice?: number;
    products: Array<{ storeId: string; productId: string; name: string; sku?: string; price?: number; url?: string }>;
  }>;
}
