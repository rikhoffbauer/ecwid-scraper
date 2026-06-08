import { describe, expect, test } from "bun:test";
import { clusterProducts } from "../src/server/analysis.ts";
import type { LoadedProduct } from "../src/shared/types.ts";

function products(count: number): LoadedProduct[] {
  return Array.from({ length: count }, (_, index) => ({
    storeId: `source-${index % 5}`,
    path: `products/${index}`,
    summary: { id: String(index), name: `Unique product signature${index.toString(36).padStart(5, "0")}` },
    product: { id: String(index), name: `Unique product signature${index.toString(36).padStart(5, "0")}` }
  }));
}

describe("analysis performance", () => {
  test("still groups high-confidence matching products", () => {
    const matching = products(2).map((item, index) => ({
      ...item,
      storeId: `source-${index}`,
      summary: { ...item.summary, name: "Acme oak dining chair", sku: "CHAIR-1" },
      product: { ...item.product, name: "Acme oak dining chair", sku: "CHAIR-1" }
    }));
    const clusters = clusterProducts(matching, .85);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.matchType).toBe("heuristic");
  });

  test("uses accepted canonical links before heuristic similarity", () => {
    const linked = products(3).map((item, index) => ({
      ...item,
      storeId: `source-${index}`,
      summary: { ...item.summary, name: index === 2 ? "Different variant title" : "Same noisy title" },
      canonicalProductId: index === 2 ? 2 : 1,
      canonicalMatchConfidence: .98,
      canonicalMatchReviewState: "accepted"
    }));
    const clusters = clusterProducts(linked, 0);
    expect(clusters).toHaveLength(2);
    expect(clusters.every((cluster) => cluster.matchType === "canonical")).toBe(true);
    expect(clusters.find((cluster) => cluster.id === "canonical-1")?.products).toHaveLength(2);
  });

  test("clusters a large distinct catalogue without quadratic main-thread work", () => {
    const startedAt = performance.now();
    const clusters = clusterProducts(products(3_000), .85);
    const elapsed = performance.now() - startedAt;
    expect(clusters).toHaveLength(3_000);
    expect(elapsed).toBeLessThan(2_000);
  });
});
