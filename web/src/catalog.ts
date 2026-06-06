import type { AppConfig, LoadedProduct, ProductEvent, ProductStateIndexRecord, ProductSummary, StoreConfig } from "./types";

export interface CatalogProduct {
  key: string;
  storeId: string;
  storeName: string;
  storeUrl?: string;
  branch: string;
  productId: string;
  hash: string;
  path: string;
  shardPath: string;
  summary: ProductSummary;
  product?: Record<string, unknown>;
}

const MEANINGFUL_SUMMARY_KEYS: Array<keyof ProductSummary> = [
  "sku",
  "name",
  "price",
  "defaultDisplayedPrice",
  "compareToPrice",
  "quantity",
  "inStock",
  "url",
  "thumbnailUrl",
  "imageUrl",
  "smallThumbnailUrl",
  "hdThumbnailUrl",
  "categoryIds",
  "categoryNames",
  "attributeCount",
  "optionCount",
  "imageCount"
];

export function productKey(storeId: string, productId: string): string {
  return `${storeId}:${productId}`;
}

export function storeDisplayName(store?: Pick<StoreConfig, "id" | "name">): string {
  return store?.name?.trim() || store?.id || "Unknown store";
}

export function productPrice(summary: ProductSummary, product?: Record<string, unknown>): number | undefined {
  if (typeof summary.price === "number") return summary.price;
  if (typeof summary.defaultDisplayedPrice === "number") return summary.defaultDisplayedPrice;
  if (product) {
    for (const key of ["price", "defaultDisplayedPrice"]) {
      const value = product[key];
      if (typeof value === "number" && Number.isFinite(value)) return value;
    }
  }
  return undefined;
}

export function productName(summary: ProductSummary, product?: Record<string, unknown>): string {
  if (summary.name?.trim()) return summary.name;
  const productName = product?.name;
  return typeof productName === "string" && productName.trim() ? productName : `Product ${summary.id}`;
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) if (typeof value === "string" && value.trim()) return value;
  return undefined;
}

function galleryImage(product?: Record<string, unknown>): string | undefined {
  const gallery = product?.galleryImages;
  if (!Array.isArray(gallery)) return undefined;
  for (const item of gallery) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    const url = firstString(record.url, record.thumbnailUrl, record.originalImageUrl, record.imageUrl, record.hdThumbnailUrl);
    if (url) return url;
  }
  return undefined;
}

export function productImageUrl(summary: ProductSummary, product?: Record<string, unknown>): string | undefined {
  return firstString(
    summary.thumbnailUrl,
    summary.imageUrl,
    summary.hdThumbnailUrl,
    summary.smallThumbnailUrl,
    product?.thumbnailUrl,
    product?.imageUrl,
    product?.hdThumbnailUrl,
    product?.smallThumbnailUrl,
    product?.originalImageUrl,
    galleryImage(product)
  );
}

export function productUrl(summary: ProductSummary, product?: Record<string, unknown>, storeUrl?: string): string | undefined {
  const direct = firstString(summary.url, product?.url, product?.productUrl, product?.link);
  if (direct) return direct;
  if (!storeUrl) return undefined;
  const slug = firstString(product?.seoSlug, product?.slug);
  if (slug) return `${storeUrl.replace(/\/$/, "")}/${slug.replace(/^\//, "")}`;
  return undefined;
}

export function stockLabel(summary: ProductSummary): string {
  if (summary.enabled === false) return "disabled";
  if (summary.inStock === false) return "out of stock";
  if (typeof summary.quantity === "number") return `${summary.quantity} in stock`;
  return "available";
}

export function formatPrice(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR", maximumFractionDigits: value % 1 === 0 ? 0 : 2 }).format(value);
}

export function hasMeaningfulAttributes(item: Pick<CatalogProduct, "summary" | "product">): boolean {
  if (item.summary.enabled === false) return false;
  for (const key of MEANINGFUL_SUMMARY_KEYS) {
    const value = item.summary[key];
    if (Array.isArray(value) && value.length > 0) return true;
    if (typeof value === "number" && Number.isFinite(value)) return true;
    if (typeof value === "boolean") return true;
    if (typeof value === "string" && value.trim()) return true;
  }
  const product = item.product;
  if (!product) return false;
  return Object.keys(product).some((key) => !["id", "numericId", "enabled"].includes(key));
}

export function categoryText(summary: ProductSummary): string {
  return [...(summary.categoryNames ?? []), ...(summary.categoryIds ?? []).map(String)].join(", ");
}

export function searchableText(item: CatalogProduct): string {
  return [
    item.storeId,
    item.storeName,
    item.productId,
    item.hash,
    item.path,
    item.summary.name,
    item.summary.sku,
    item.summary.url,
    productPrice(item.summary),
    categoryText(item.summary)
  ].filter((value) => value !== undefined && value !== null && String(value).trim()).join(" ").toLowerCase();
}

export function catalogContext(item: CatalogProduct): Record<string, unknown> {
  const price = productPrice(item.summary, item.product);
  const title = productName(item.summary, item.product);
  return {
    ...item.product,
    ...item.summary,
    id: item.productId,
    productId: item.productId,
    storeId: item.storeId,
    store: item.storeId,
    storeName: item.storeName,
    branch: item.branch,
    path: item.path,
    shardPath: item.shardPath,
    hash: item.hash,
    title,
    name: title,
    price,
    categories: item.summary.categoryNames ?? item.summary.categoryIds ?? [],
    category: categoryText(item.summary),
    summary: item.summary,
    product: item.product ?? {}
  };
}

export function buildCatalogProducts(config: AppConfig | null, recordsByStore: Record<string, ProductStateIndexRecord[]>, storeBranch: (config: AppConfig, storeId: string) => string): CatalogProduct[] {
  if (!config) return [];
  const stores = new Map(config.stores.map((store) => [store.id, store]));
  const items: CatalogProduct[] = [];
  for (const [storeId, records] of Object.entries(recordsByStore)) {
    const store = stores.get(storeId);
    const branch = storeBranch(config, storeId);
    for (const record of records) {
      items.push({
        key: productKey(storeId, record.productId),
        storeId,
        storeName: storeDisplayName(store),
        storeUrl: store?.url,
        branch,
        productId: record.productId,
        hash: record.hash,
        path: record.path,
        shardPath: record.shardPath,
        summary: record.summary
      });
    }
  }
  return items.sort((a, b) => productName(a.summary).localeCompare(productName(b.summary)) || a.storeName.localeCompare(b.storeName));
}

export function itemToLoadedProduct(item: CatalogProduct, product?: Record<string, unknown>): LoadedProduct {
  return { storeId: item.storeId, path: item.path, hash: item.hash, summary: item.summary, product: product ?? item.product ?? {} };
}

const STOP = new Set(["the", "and", "for", "with", "from", "van", "een", "het", "de", "new", "used", "set", "pcs", "piece"]);

function tokens(value: string): Set<string> {
  return new Set(value.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(/\s+/).filter((token) => token.length >= 3 && !STOP.has(token)));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

export function similarProducts(target: CatalogProduct, products: CatalogProduct[], minScore = 0.42): Array<CatalogProduct & { matchScore: number; matchReason: string }> {
  const targetSku = target.summary.sku?.trim().toLowerCase();
  const targetTokens = tokens([target.summary.name, target.summary.sku, categoryText(target.summary)].filter(Boolean).join(" "));
  return products
    .filter((candidate) => candidate.key !== target.key)
    .map((candidate) => {
      const sku = candidate.summary.sku?.trim().toLowerCase();
      if (targetSku && sku && targetSku === sku) return { ...candidate, matchScore: 1, matchReason: "same SKU" };
      const candidateTokens = tokens([candidate.summary.name, candidate.summary.sku, categoryText(candidate.summary)].filter(Boolean).join(" "));
      const score = jaccard(targetTokens, candidateTokens);
      return { ...candidate, matchScore: score, matchReason: "name/category overlap" };
    })
    .filter((candidate) => candidate.matchScore >= minScore)
    .sort((a, b) => b.matchScore - a.matchScore || a.storeName.localeCompare(b.storeName));
}

export function summarizeHistory(events: ProductEvent[]): { createdAt?: string; deletedAt?: string; lastEditedAt?: string; editCount: number } {
  const createdAt = events.find((event) => event.eventType === "product.created")?.observedAt;
  const deletedAt = [...events].reverse().find((event) => event.eventType === "product.deleted")?.observedAt;
  const edits = events.filter((event) => event.eventType === "product.field_changed");
  return { createdAt, deletedAt, lastEditedAt: edits.at(-1)?.observedAt, editCount: edits.length };
}
