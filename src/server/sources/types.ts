import type { JsonObject, JsonValue } from "../../shared/types.ts";

export type SourceKind = "ecwid" | "shopify" | "marktplaats" | "ibood" | "2dekansje" | "retoertje" | "generated";

export interface SourceConfig {
  id: string;
  kind: SourceKind;
  name?: string;
  url: string;
  enabled?: boolean;
  syncIntervalMinutes?: number;
  credentialsEnv?: Record<string, string>;
  settings?: Record<string, JsonValue>;
}

export interface ProductOfferingInput {
  sourceId: string;
  sourceKind: SourceKind;
  externalId: string;
  title: string;
  description?: string;
  url: string;
  imageUrls: string[];
  currency?: string;
  price?: number;
  compareAtPrice?: number;
  availability: "available" | "unavailable" | "unknown";
  condition?: string;
  seller?: string;
  categories: string[];
  attributes: Record<string, JsonValue>;
  raw: JsonObject;
}

/** @deprecated Store adapters produce offerings, not canonical products. */
export type CanonicalProduct = ProductOfferingInput;

export interface ReadOnlyHttpClient {
  fetch(input: string | URL | Request, init?: RequestInit): Promise<Response>;
}

export interface SourceContext {
  http: ReadOnlyHttpClient;
}

export interface SourceSearchInput {
  query: string;
}

export interface GeneratedPageResult {
  products: ProductOfferingInput[];
  nextPageUrl?: string;
}

export interface GeneratedAdapterContext {
  http: ReadOnlyHttpClient;
}

export interface GeneratedSourcePlugin {
  fetchCatalogPage(input: { config: SourceConfig; url: string; pageNumber: number }, context: GeneratedAdapterContext): Promise<GeneratedPageResult>;
  fetchProduct(input: { config: SourceConfig; url: string }, context: GeneratedAdapterContext): Promise<ProductOfferingInput | null>;
  fetchSearchResults(input: { config: SourceConfig; url: string; query: string }, context: GeneratedAdapterContext): Promise<GeneratedPageResult>;
}

export interface ReadOnlySourceAdapter<TConfig> {
  readonly kind: SourceKind;
  fetchProducts(config: TConfig, context: SourceContext): AsyncGenerator<ProductOfferingInput[], void, unknown>;
  searchProducts?(config: TConfig, input: SourceSearchInput, context: SourceContext): AsyncGenerator<ProductOfferingInput[], void, unknown>;
}
