import { describe, expect, test } from "bun:test";
import { createMarktplaatsAdapter, parseJsonLdProducts } from "../src/server/sources/marktplaats.ts";
import { createReadOnlyHttpClient } from "../src/server/sources/read-only-http.ts";
import { implementedSourceKinds } from "../src/server/sources/registry.ts";

const config = {
  id: "deals",
  kind: "marktplaats" as const,
  name: "Deals",
  url: "https://example.com/deals",
  enabled: true
};

const html = `
<html><head>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "@id": "deal-42",
  "name": "Exceptional headphones",
  "description": "Tracked deal",
  "image": ["https://example.com/image.jpg"],
  "brand": {"@type": "Brand", "name": "AudioCo"},
  "category": "Audio",
  "offers": {
    "@type": "Offer",
    "price": "39.95",
    "priceCurrency": "EUR",
    "availability": "https://schema.org/InStock",
    "url": "https://example.com/deal-42"
  }
}
</script>
</head></html>`;

describe("Marktplaats source adapter", () => {
  test("normalizes product metadata from public pages", () => {
    expect(parseJsonLdProducts(config, html)).toEqual([expect.objectContaining({
      sourceKind: "marktplaats",
      externalId: "deal-42",
      title: "Exceptional headphones",
      price: 39.95,
      currency: "EUR",
      availability: "available",
      seller: "AudioCo",
      categories: ["Audio"]
    })]);
  });

  test("fetches public pages through read-only HTTP", async () => {
    const methods: string[] = [];
    const adapter = createMarktplaatsAdapter();
    const products: any[] = [];
    const stream = adapter.fetchProducts(config, {
      http: createReadOnlyHttpClient((async (_input: string | URL | Request, init?: RequestInit) => {
        methods.push(init?.method ?? "GET");
        return new Response(html, { headers: { "content-type": "text/html" } });
      }) as unknown as typeof fetch)
    });
    for await (const chunk of stream) products.push(...chunk);
    
    expect(products).toHaveLength(1);
    expect(methods).toEqual(["GET"]);
  });

  test("registers every requested source kind", () => {
    expect(implementedSourceKinds()).toEqual(["ecwid", "shopify", "marktplaats", "ibood", "2dekansje", "retoertje"]);
  });

  test("requires and expands an explicit direct-search URL template", async () => {
    let requested = "";
    const adapter = createMarktplaatsAdapter();
    const searchable = { ...config, settings: { searchUrlTemplate: "https://example.com/search?q={query}" } };
    for await (const _ of adapter.searchProducts!(searchable, { query: "oak chair" }, {
      http: createReadOnlyHttpClient((async (input) => {
        requested = String(input);
        return new Response(html);
      }) as typeof fetch)
    })) {}
    expect(requested).toBe("https://example.com/search?q=oak%20chair");
    expect(async () => {
      for await (const _ of adapter.searchProducts!(config, { query: "x" }, {
        http: createReadOnlyHttpClient(fetch)
      })) {}
    }).toThrow(/searchUrlTemplate/);
  });
});
