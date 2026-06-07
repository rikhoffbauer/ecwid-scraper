import { describe, expect, test } from "bun:test";
import { createReadOnlyHttpClient } from "../src/sources/read-only-http.ts";
import { implementedSourceKinds, sourceAdapter } from "../src/sources/registry.ts";
import { shopifySourceAdapter } from "../src/sources/shopify.ts";

describe("Shopify source adapter", () => {
  test("reads and normalizes cursor-paginated Storefront products", async () => {
    const urls: URL[] = [];
    const pages = [
      {
        data: {
          products: {
            nodes: [{
              id: "gid://shopify/Product/101",
              title: "Tracked chair",
              description: "Comfortable",
              handle: "tracked-chair",
              onlineStoreUrl: null,
              productType: "Furniture",
              vendor: "Maker",
              tags: ["chair", "sale"],
              availableForSale: true,
              featuredImage: { url: "https://cdn.example/chair.jpg" },
              images: { nodes: [{ url: "https://cdn.example/chair.jpg" }] },
              priceRange: { minVariantPrice: { amount: "49.95", currencyCode: "EUR" } },
              compareAtPriceRange: { minVariantPrice: { amount: "99.90", currencyCode: "EUR" } }
            }],
            pageInfo: { hasNextPage: true, endCursor: "cursor-1" }
          }
        }
      },
      {
        data: {
          products: {
            nodes: [{ id: "gid://shopify/Product/102", title: "Lamp", availableForSale: false }],
            pageInfo: { hasNextPage: false, endCursor: "cursor-2" }
          }
        }
      }
    ];
    const http = createReadOnlyHttpClient((async (input: string | URL | Request) => {
      urls.push(new URL(String(input)));
      return Response.json(pages.shift());
    }) as unknown as typeof fetch);

    const products: any[] = [];
    const stream = shopifySourceAdapter.fetchProducts({
      id: "shop",
      kind: "shopify",
      name: "Shop",
      url: "https://example.myshopify.com",
      enabled: true
    }, { http });
    for await (const chunk of stream) products.push(...chunk);

    expect(products).toHaveLength(2);
    expect(products[0]).toMatchObject({
      sourceKind: "shopify",
      sourceId: "shop",
      externalId: "101",
      title: "Tracked chair",
      price: 49.95,
      compareAtPrice: 99.9,
      currency: "EUR",
      availability: "available",
      seller: "Maker",
      categories: ["Furniture", "chair", "sale"]
    });
    expect(products[0]?.url).toBe("https://example.myshopify.com/products/tracked-chair");
    expect(urls[1]?.searchParams.get("variables")).toContain("cursor-1");
  });

  test("registers implemented source adapters", () => {
    expect(implementedSourceKinds()).toContain("shopify");
    expect(sourceAdapter("shopify").kind).toBe("shopify");
    expect(sourceAdapter("ibood").kind).toBe("ibood");
  });
});
