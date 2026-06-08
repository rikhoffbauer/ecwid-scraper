export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export type Workspace = "catalogue" | "searches" | "intelligence" | "enrichment" | "activity" | "sources" | "settings";
export type RightTab = "assistant" | "details" | "activity";

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
  adapterId?: string;
  onboarding?: {
    catalogUrl: string;
    catalogPageNumber: number;
    productUrl: string;
    searchUrl: string;
    searchQuery: string;
  };
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
  credentialsEnv?: Record<string, string>;
  settings?: Record<string, JsonValue>;
  webhooks?: StoreWebhookConfig[];
}

export interface AppConfig {
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
export type ProductOfferingEvent = ProductEvent;
export type ProductOfferingSummary = ProductSummary;

export interface ProductOffering {
  id: number;
  storeId: string;
  externalId: string;
  hash: string;
  data: JsonObject;
  canonicalProductId?: number | null;
  enrichmentState: "pending" | "enriched" | "review" | "failed";
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: number;
  name: string;
  normalizedName: string;
  brand?: string | null;
  model?: string | null;
  variantIdentity?: JsonObject;
  categoryId?: number | null;
  reviewState: "pending" | "accepted" | "rejected";
  createdAt: string;
  updatedAt: string;
}

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
  canonicalProductId?: number | null;
  canonicalMatchConfidence?: number | null;
  canonicalMatchReviewState?: string | null;
}

export interface ProductCluster {
  id: string;
  label: string;
  products: LoadedProduct[];
  tokenSignature: string;
  confidence: number;
  matchType: "canonical" | "heuristic";
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
    matchType: "canonical" | "heuristic";
    productCount: number;
    storeIds: string[];
    medianPrice?: number;
    minPrice?: number;
    maxPrice?: number;
    avgPrice?: number;
    products: Array<{ storeId: string; productId: string; name: string; sku?: string; price?: number; url?: string }>;
  }>;
}

export interface SavedSearch {
  id: number;
  name: string;
  query: string;
  sourceIds: string[];
  watched: boolean;
  enabled: boolean;
  intervalMinutes: number;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastRunStatus: string | null;
}

export interface DirectSearchResult {
  query: string;
  products: Array<{
    sourceId: string;
    externalId: string;
    title: string;
    url: string;
    imageUrls: string[];
    price?: number;
    currency?: string;
  }>;
  sources: Array<{ sourceId: string; status: "succeeded" | "failed"; count: number; error?: string }>;
}

export interface SavedSearchDetails {
  results: Array<{ sourceId: string; productId: string; product: { summary?: ProductSummary }; firstSeenAt: string; lastSeenAt: string }>;
  runs: Array<{ id: number; status: string; resultCount: number; startedAt: string; completedAt: string }>;
  events: Array<{ id: number; sourceId: string; productId: string; eventType: string; observedAt: string }>;
}

export interface OnboardingJob {
  id: string;
  adapterId: string;
  status: "queued" | "running" | "inconclusive" | "failed" | "activated" | "rejected";
  hardFailure: boolean;
  diagnostics: string[];
  events: Array<{ at: string; message: string }>;
  preview?: {
    catalog: Array<{ externalId: string; title: string; url: string; price?: number }>;
    product: { externalId: string; title: string; url: string; price?: number } | null;
    search: Array<{ externalId: string; title: string; url: string; price?: number }>;
    nextCatalog?: Array<{ externalId: string; title: string; url: string; price?: number }>;
  };
}

export interface LLMProvider {
  id: number;
  name?: string;
  provider: string;
  configJson: string;
  model: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EnrichmentRun {
  id: string;
  status: string;
  harness?: string | null;
  model?: string | null;
  artifact_path?: string | null;
  error?: string | null;
  created_at: string;
  completed_at?: string | null;
}

export type EnrichmentProposal = {
  id: number;
  enrichment_run_id: string;
  source_product_offering_id: number;
  target_entity_type: string;
  target_entity_id?: number | null;
  proposed_value_json: string;
  normalized_proposed_value?: string | null;
  confidence: number;
  reasoning_summary?: string;
  review_state: "pending" | "accepted" | "rejected";
  created_at: string;
};

export type EnrichmentProposals = Record<string, EnrichmentProposal[]>;

export interface EnrichmentApplyResult {
  appliedCanonicalMatches: number;
  createdCanonicalProducts: number;
  appliedLabels: number;
  appliedSpecifications: number;
  appliedIdentifiers: number;
  appliedCategories: number;
  reviewRequired: number;
  errors: string[];
}
