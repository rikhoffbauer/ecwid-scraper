import type { JsonObject, JsonValue } from "../types.ts";
import type { CanonicalProduct, ReadOnlySourceAdapter, SourceConfig, SourceKind } from "./types.ts";

export type JsonLdMarketplaceKind = "marktplaats" | "ibood" | "2dekansje" | "retoertje";
export interface JsonLdMarketplaceConfig extends SourceConfig {
  kind: JsonLdMarketplaceKind;
}

function records(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.flatMap(records);
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  const graph = records(record["@graph"]);
  const list = record["@type"] === "ItemList" && Array.isArray(record.itemListElement)
    ? record.itemListElement.flatMap((item) => {
      if (item && typeof item === "object" && !Array.isArray(item) && "item" in item) return records((item as Record<string, unknown>).item);
      return records(item);
    })
    : [];
  return [record, ...graph, ...list];
}

function typeNames(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  return [];
}

function firstString(...values: unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === "string" && value.trim().length > 0);
}

function price(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function imageUrls(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === "string") return [item];
    if (item && typeof item === "object" && !Array.isArray(item)) {
      const url = firstString((item as Record<string, unknown>).url, (item as Record<string, unknown>).contentUrl);
      return url ? [url] : [];
    }
    return [];
  });
}

function offer(record: Record<string, unknown>): Record<string, unknown> {
  const value = Array.isArray(record.offers) ? record.offers[0] : record.offers;
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function normalize(config: JsonLdMarketplaceConfig, record: Record<string, unknown>, pageUrl: string): CanonicalProduct | null {
  const types = typeNames(record["@type"]);
  if (!types.some((type) => ["Product", "Offer"].includes(type))) return null;
  const productOffer = offer(record);
  const url = firstString(record.url, productOffer.url, pageUrl) ?? pageUrl;
  const title = firstString(record.name, record.headline);
  if (!title) return null;
  const id = firstString(record.sku, record.productID, record["@id"], url) ?? url;
  const availability = firstString(productOffer.availability, record.availability)?.toLowerCase();
  return {
    sourceId: config.id,
    sourceKind: config.kind,
    externalId: id,
    title,
    description: firstString(record.description),
    url,
    imageUrls: [...new Set(imageUrls(record.image))],
    currency: firstString(productOffer.priceCurrency, record.priceCurrency),
    price: price(productOffer.price ?? record.price),
    availability: availability?.includes("outofstock") || availability?.includes("soldout")
      ? "unavailable"
      : availability ? "available" : "unknown",
    condition: firstString(record.itemCondition),
    seller: firstString(
      record.brand && typeof record.brand === "object" && !Array.isArray(record.brand) ? (record.brand as Record<string, unknown>).name : record.brand,
      record.seller && typeof record.seller === "object" && !Array.isArray(record.seller) ? (record.seller as Record<string, unknown>).name : record.seller
    ),
    categories: [firstString(record.category)].filter((value): value is string => !!value),
    attributes: {},
    raw: record as JsonObject
  };
}

export function parseJsonLdProducts(config: JsonLdMarketplaceConfig, html: string, pageUrl = config.url): CanonicalProduct[] {
  const products: CanonicalProduct[] = [];
  const scriptPattern = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(scriptPattern)) {
    try {
      const parsed = JSON.parse(match[1] ?? "null") as JsonValue;
      for (const record of records(parsed)) {
        const product = normalize(config, record, pageUrl);
        if (product) products.push(product);
      }
    } catch {
      // Ignore individual malformed metadata blocks; source health reports zero products.
    }
  }
  return [...new Map(products.map((product) => [product.externalId, product])).values()];
}

export function createJsonLdMarketplaceAdapter(kind: JsonLdMarketplaceKind): ReadOnlySourceAdapter<JsonLdMarketplaceConfig> {
  return {
    kind,
    async fetchProducts(config, context) {
      const response = await context.http.fetch(config.url, {
        headers: { accept: "text/html,application/xhtml+xml" }
      });
      if (!response.ok) throw new Error(`${kind} source ${config.id} failed: ${response.status} ${response.statusText}`);
      return parseJsonLdProducts(config, await response.text(), response.url || config.url);
    }
  };
}
