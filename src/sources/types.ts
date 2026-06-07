import type { JsonObject, JsonValue } from "../types.ts";

export type SourceKind = "ecwid" | "shopify" | "marktplaats" | "ibood" | "2dekansje" | "retoertje";

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

export interface CanonicalProduct {
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

export interface ReadOnlyHttpClient {
  fetch(input: string | URL | Request, init?: RequestInit): Promise<Response>;
}

export interface SourceContext {
  http: ReadOnlyHttpClient;
}

export interface ReadOnlySourceAdapter<TConfig> {
  readonly kind: SourceKind;
  fetchProducts(config: TConfig, context: SourceContext): AsyncGenerator<CanonicalProduct[], void, unknown>;
}
