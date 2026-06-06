import type { AnalysisSnapshot, DealCandidate, LoadedProduct, PriceIndexRow, ProductCluster } from "./types";

const STOP = new Set(["the", "and", "for", "with", "from", "van", "een", "het", "de", "new", "used", "set", "pcs", "piece", "black", "white"]);

function hasSummary(value: unknown): value is { summary: { name?: string; price?: number; defaultDisplayedPrice?: number } } {
  return !!value && typeof value === "object" && "summary" in value && !!(value as { summary?: unknown }).summary && typeof (value as { summary?: unknown }).summary === "object";
}

export function productName(product: Record<string, unknown> | { summary?: { name?: string } }): string {
  if (hasSummary(product) && product.summary.name) return product.summary.name;
  const value = (product as Record<string, unknown>).name;
  return typeof value === "string" && value.trim() ? value : "Unnamed product";
}

export function productPrice(product: Record<string, unknown> | { summary?: { price?: number; defaultDisplayedPrice?: number } }): number | undefined {
  if (hasSummary(product)) return product.summary.price ?? product.summary.defaultDisplayedPrice;
  for (const key of ["price", "defaultDisplayedPrice"]) {
    const value = (product as Record<string, unknown>)[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return undefined;
}

function productSku(item: LoadedProduct): string | undefined {
  return item.summary.sku || (typeof item.product.sku === "string" ? item.product.sku : undefined);
}

function categoryText(item: LoadedProduct): string {
  return [...(item.summary.categoryNames ?? []), ...(item.summary.categoryIds ?? []).map(String)].join(" ");
}

export function tokenize(value: string): Set<string> {
  return new Set(value.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(/\s+/).filter((token) => token.length >= 3 && !STOP.has(token)));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

function median(values: number[]): number | undefined {
  const sorted = values.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (sorted.length === 0) return undefined;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2 : sorted[mid];
}

function average(values: number[]): number | undefined {
  const xs = values.filter((n) => Number.isFinite(n));
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined;
}

function signature(item: LoadedProduct): Set<string> {
  const parts = [productName(item.product), item.summary.sku ?? "", categoryText(item)].join(" ");
  return tokenize(parts);
}

function scoreAgainstCluster(item: LoadedProduct, cluster: ProductCluster): number {
  const sku = productSku(item);
  if (sku && cluster.products.some((candidate) => productSku(candidate) === sku)) return 1;
  const a = signature(item);
  const b = tokenize(cluster.tokenSignature);
  const lexical = jaccard(a, b);
  const category = categoryText(item) && cluster.products.some((candidate) => categoryText(candidate) && categoryText(candidate) === categoryText(item)) ? 0.1 : 0;
  return Math.min(1, lexical + category);
}

export function clusterProducts(products: LoadedProduct[], threshold: number): ProductCluster[] {
  const clusters: ProductCluster[] = [];
  for (const item of products) {
    let best: { cluster: ProductCluster; score: number } | null = null;
    for (const cluster of clusters) {
      const score = scoreAgainstCluster(item, cluster);
      if (!best || score > best.score) best = { cluster, score };
    }
    if (best && best.score >= threshold) {
      best.cluster.products.push(item);
      best.cluster.confidence = Math.max(best.cluster.confidence, best.score);
      best.cluster.tokenSignature = [...new Set([...tokenize(best.cluster.tokenSignature), ...signature(item)])].sort().join(" ");
    } else {
      clusters.push({ id: `cluster-${clusters.length + 1}`, label: productName(item.product), products: [item], tokenSignature: [...signature(item)].sort().join(" "), confidence: 1, storeIds: [item.storeId] });
    }
  }
  return clusters.map((cluster) => {
    const prices = cluster.products.map((item) => productPrice(item.product)).filter((price): price is number => typeof price === "number");
    const storeIds = [...new Set(cluster.products.map((item) => item.storeId))].sort();
    return { ...cluster, storeIds, minPrice: prices.length ? Math.min(...prices) : undefined, maxPrice: prices.length ? Math.max(...prices) : undefined, avgPrice: average(prices), medianPrice: median(prices) };
  }).sort((a, b) => b.products.length - a.products.length || a.label.localeCompare(b.label));
}

export function priceIndex(clusters: ProductCluster[]): PriceIndexRow[] {
  const byStore = new Map<string, number[]>();
  for (const cluster of clusters) {
    if (!cluster.medianPrice || cluster.medianPrice <= 0 || cluster.products.length < 2) continue;
    for (const item of cluster.products) {
      const price = productPrice(item.product);
      if (typeof price !== "number" || price <= 0) continue;
      const list = byStore.get(item.storeId) ?? [];
      list.push(price / cluster.medianPrice);
      byStore.set(item.storeId, list);
    }
  }
  return [...byStore.entries()].map(([storeId, ratios]) => ({
    storeId,
    comparedProducts: ratios.length,
    medianRelativePrice: median(ratios) ?? 0,
    averageRelativePrice: average(ratios) ?? 0,
    minRelativePrice: Math.min(...ratios),
    maxRelativePrice: Math.max(...ratios)
  })).sort((a, b) => a.medianRelativePrice - b.medianRelativePrice);
}

export function dealCandidates(clusters: ProductCluster[], threshold: number): DealCandidate[] {
  const deals: DealCandidate[] = [];
  for (const cluster of clusters) {
    if (!cluster.medianPrice || cluster.products.length < 2) continue;
    for (const item of cluster.products) {
      const price = productPrice(item.product);
      if (typeof price !== "number" || price <= 0) continue;
      const relativePrice = price / cluster.medianPrice;
      if (relativePrice <= threshold) {
        deals.push({ storeId: item.storeId, productId: item.summary.id, name: productName(item.product), price, clusterMedianPrice: cluster.medianPrice, relativePrice, clusterSize: cluster.products.length, url: item.summary.url });
      }
    }
  }
  return deals.sort((a, b) => a.relativePrice - b.relativePrice).slice(0, 500);
}

export function buildAnalysisSnapshot(products: LoadedProduct[], clusters: ProductCluster[], dealThreshold: number): AnalysisSnapshot {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    productCount: products.length,
    storeCount: new Set(products.map((item) => item.storeId)).size,
    clusterCount: clusters.length,
    multiStoreClusterCount: clusters.filter((cluster) => cluster.storeIds.length > 1).length,
    priceIndex: priceIndex(clusters),
    dealCandidates: dealCandidates(clusters, dealThreshold),
    clusters: clusters.slice(0, 1000).map((cluster) => ({
      id: cluster.id,
      label: cluster.label,
      productCount: cluster.products.length,
      storeIds: cluster.storeIds,
      medianPrice: cluster.medianPrice,
      minPrice: cluster.minPrice,
      maxPrice: cluster.maxPrice,
      avgPrice: cluster.avgPrice,
      products: cluster.products.slice(0, 200).map((item) => ({ storeId: item.storeId, productId: item.summary.id, name: productName(item.product), sku: item.summary.sku, price: productPrice(item.product), url: item.summary.url }))
    }))
  };
}
