import { describe, expect, test } from "bun:test";
import { createRetoertjeAdapter } from "../src/server/sources/retoertje.ts";
import { createReadOnlyHttpClient } from "../src/server/sources/read-only-http.ts";
import { implementedSourceKinds } from "../src/server/sources/registry.ts";

const config = {
  id: "retoertje-test",
  kind: "retoertje" as const,
  url: "https://retoertje.nl",
  enabled: true
};

const mockHomePayload = {
  categories: [
    { title: "Retourdeals", url: "retourdeals" }
  ]
};

const mockCatalogPayload = {
  catalog: {
    categories: [
      { title: "Meubels", url: "retourdeals/meubels" }
    ]
  }
};

const mockCollectionPayload = {
  collection: {
    pages: 1,
    products: {
      "123": {
        id: 123,
        url: "test-product.html",
        title: "Test Product",
        price: { price: 29.99, price_old: 49.99 },
        available: true,
        image: 98765,
        brand: { title: "BrandX" }
      }
    }
  }
};

describe("Retoertje source adapter", () => {
  test("is registered", () => {
    expect(implementedSourceKinds()).toContain("retoertje");
  });

  test("fetches and parses products recursively", async () => {
    const urls: string[] = [];
    const adapter = createRetoertjeAdapter();
    
    const stream = adapter.fetchProducts(config, {
      http: createReadOnlyHttpClient((async (input: string | URL | Request) => {
        const urlStr = input.toString();
        urls.push(urlStr);
        
        if (urlStr.includes("format=json")) {
          if (urlStr.includes("https://retoertje.nl/?format=json")) {
            return new Response(JSON.stringify(mockHomePayload));
          }
          if (urlStr.includes("https://retoertje.nl/retourdeals/?format=json") || urlStr.includes("https://retoertje.nl/retourdeals/?")) {
            return new Response(JSON.stringify(mockCatalogPayload));
          }
          if (urlStr.includes("https://retoertje.nl/retourdeals/meubels/")) {
            return new Response(JSON.stringify(mockCollectionPayload));
          }
        }
        return new Response("Not Found", { status: 404 });
      }) as unknown as typeof fetch)
    });
    
    const products: any[] = [];
    for await (const chunk of stream) {
      products.push(...chunk);
    }
    
    expect(products).toHaveLength(1);
    expect(products[0]).toEqual(expect.objectContaining({
      sourceId: "retoertje-test",
      sourceKind: "retoertje",
      externalId: expect.any(String),
      title: "Test Product",
      url: "https://retoertje.nl/test-product.html",
      price: 29.99,
      compareAtPrice: 49.99,
      currency: "EUR",
      availability: "available",
      seller: "BrandX",
      imageUrls: ["https://cdn.webshopapp.com/shops/351609/files/98765/image.jpg"]
    }));
  });

  test("searches products via search endpoint", async () => {
    const urls: string[] = [];
    const adapter = createRetoertjeAdapter();
    
    const stream = adapter.searchProducts!(config, { query: "laptop" }, {
      http: createReadOnlyHttpClient((async (input: string | URL | Request) => {
        const urlStr = input.toString();
        urls.push(urlStr);
        if (urlStr.includes("/search/laptop/")) {
          return new Response(JSON.stringify(mockCollectionPayload));
        }
        return new Response("Not Found", { status: 404 });
      }) as unknown as typeof fetch)
    });
    
    const products: any[] = [];
    for await (const chunk of stream) {
      products.push(...chunk);
    }
    
    expect(products).toHaveLength(1);
    expect(urls[0]).toContain("/search/laptop/");
    expect(urls[0]).toContain("format=json");
  });
});
