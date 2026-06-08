import type { JsonObject, JsonValue } from "../../shared/types.ts";
import type { ProductOfferingInput, SourceKind } from "./types.ts";

function firstString(...values: unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === "string" && value.trim().length > 0);
}

function numberValue(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return undefined;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function imageUrls(product: JsonObject): string[] {
  const urls = [
    product.imageUrl,
    product.thumbnailUrl,
    product.hdThumbnailUrl,
    product.smallThumbnailUrl,
    product.originalImageUrl
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  if (Array.isArray(product.galleryImages)) {
    for (const image of product.galleryImages) {
      if (!image || typeof image !== "object" || Array.isArray(image)) continue;
      const url = firstString(image.url, image.imageUrl, image.thumbnailUrl, image.originalImageUrl);
      if (url) urls.push(url);
    }
  }
  return [...new Set(urls)];
}

function categoryNames(product: JsonObject): string[] {
  const categories = stringArray(product.categoryNames);
  if (Array.isArray(product.categories)) {
    for (const category of product.categories) {
      if (typeof category === "string" && category.trim()) categories.push(category);
      else if (category && typeof category === "object" && !Array.isArray(category) && typeof category.name === "string") categories.push(category.name);
    }
  }
  return [...new Set(categories)];
}

export function offeringFromEcwid(sourceId: string, product: JsonObject): ProductOfferingInput {
  const externalId = String(product.id);
  const enabled = product.enabled !== false;
  const inStock = product.inStock !== false;
  return {
    sourceId,
    sourceKind: "ecwid",
    externalId,
    title: firstString(product.name) ?? `Product ${externalId}`,
    description: firstString(product.description),
    url: firstString(product.url, product.productUrl) ?? "",
    imageUrls: imageUrls(product),
    currency: firstString(product.currency),
    price: numberValue(product.price, product.defaultDisplayedPrice),
    compareAtPrice: numberValue(product.compareToPrice),
    availability: enabled && inStock ? "available" : "unavailable",
    seller: firstString(product.brand),
    categories: categoryNames(product),
    attributes: {},
    raw: product
  };
}

export function offeringRawProduct(product: ProductOfferingInput): JsonObject {
  return {
    ...product.raw,
    id: product.externalId,
    name: product.title,
    url: product.url,
    imageUrl: product.imageUrls[0],
    price: product.price,
    compareToPrice: product.compareAtPrice,
    inStock: product.availability === "available",
    enabled: product.availability !== "unavailable",
    categories: product.categories.map((name) => ({ name })),
    sourceId: product.sourceId,
    sourceKind: product.sourceKind,
    offering: {
      sourceId: product.sourceId,
      sourceKind: product.sourceKind,
      externalId: product.externalId,
      title: product.title,
      description: product.description,
      url: product.url,
      imageUrls: product.imageUrls,
      currency: product.currency,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      availability: product.availability,
      condition: product.condition,
      seller: product.seller,
      categories: product.categories,
      attributes: product.attributes as Record<string, JsonValue>
    }
  } as JsonObject;
}

export function sourceProductKey(kind: SourceKind, sourceId: string, externalId: string): string {
  return `${kind}:${sourceId}:${externalId}`;
}
