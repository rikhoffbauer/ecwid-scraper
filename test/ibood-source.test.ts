import { describe, expect, test } from "bun:test";
import { iboodSourceAdapter } from "../src/server/sources/ibood.ts";
import { createReadOnlyHttpClient } from "../src/server/sources/read-only-http.ts";
import { implementedSourceKinds } from "../src/server/sources/registry.ts";

const config = {
  id: "ibood-test",
  kind: "ibood" as const,
  url: "https://example.com/not-used", // ibood adapter uses the api URL internally
  enabled: true
};

const jsonResponse = {
  data: {
    code: 200,
    items: [
      {
        id: "product-123",
        title: "Test Product",
        slug: "test-product",
        classicId: "456",
        brand: "TestBrand",
        soldOut: false,
        price: { currency: "EUR", value: 49.99 },
        referencePrice: { currency: "EUR", value: 99.99 },
        categories: ["cat1"]
      }
    ],
    itemCount: 1,
    totalItems: 1
  }
};

describe("iBOOD source adapter", () => {
  test("fetches products from iBOOD API", async () => {
    const urls: string[] = [];
    const headers: Record<string, string>[] = [];
    
    const stream = iboodSourceAdapter.fetchProducts(config, {
      http: createReadOnlyHttpClient((async (input: string | URL | Request, init?: RequestInit) => {
        urls.push(input.toString());
        if (init?.headers) headers.push(init.headers as Record<string, string>);
        return new Response(JSON.stringify(jsonResponse), { headers: { "content-type": "application/json" } });
      }) as unknown as typeof fetch)
    });
    
    const products: any[] = [];
    for await (const chunk of stream) products.push(...chunk);
    
    expect(products).toHaveLength(1);
    expect(products[0]).toEqual(expect.objectContaining({
      sourceKind: "ibood",
      externalId: "product-123",
      title: "Test Product",
      url: "https://www.ibood.com/nl/s-nl/o/test-product/456",
      price: 49.99,
      compareAtPrice: 99.99,
      currency: "EUR",
      availability: "available",
      seller: "TestBrand",
      categories: ["cat1"]
    }));
    
    expect(urls).toEqual(["https://api.ibood.io/search/items/live?take=1000&skip=0"]);
    expect(headers[0]).toHaveProperty("ibex-language", "nl");
    expect(headers[0]).toHaveProperty("ibex-shop-id", "b22a484d-fd20-570a-adf6-22edf2fdaf79");
    expect(headers[0]).toHaveProperty("ibex-tenant-id", "eafb3ef2-e1ba-4f01-b67a-b0447bea74eb");
    expect(headers[0]).toHaveProperty("user-agent");
  });

  test("searches products from iBOOD API", async () => {
    const urls: string[] = [];
    
    const stream = iboodSourceAdapter.searchProducts!(config, { query: "laptop" }, {
      http: createReadOnlyHttpClient((async (input: string | URL | Request) => {
        urls.push(input.toString());
        return new Response(JSON.stringify(jsonResponse), { headers: { "content-type": "application/json" } });
      }) as unknown as typeof fetch)
    });
    
    const products: any[] = [];
    for await (const chunk of stream) products.push(...chunk);
    
    expect(products).toHaveLength(1);
    expect(urls[0]).toContain("q=laptop");
    expect(urls[0]).toContain("https://api.ibood.io/search/items/live");
  });

  test("is registered", () => {
    expect(implementedSourceKinds()).toContain("ibood");
  });
});
