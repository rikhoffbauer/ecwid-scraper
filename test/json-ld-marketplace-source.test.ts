import { describe, expect, test } from "bun:test";
import { createJsonLdMarketplaceAdapter, parseJsonLdProducts } from "../src/sources/json-ld-marketplace.ts";
import { createReadOnlyHttpClient } from "../src/sources/read-only-http.ts";
import { implementedSourceKinds } from "../src/sources/registry.ts";

const config = {
  id: "deals",
  kind: "ibood" as const,
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

describe("JSON-LD marketplace source adapters", () => {
  test("normalizes product metadata from public pages", () => {
    expect(parseJsonLdProducts(config, html)).toEqual([expect.objectContaining({
      sourceKind: "ibood",
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
    const adapter = createJsonLdMarketplaceAdapter("ibood");
    const products = await adapter.fetchProducts(config, {
      http: createReadOnlyHttpClient((async (_input: string | URL | Request, init?: RequestInit) => {
        methods.push(init?.method ?? "GET");
        return new Response(html, { headers: { "content-type": "text/html" } });
      }) as unknown as typeof fetch)
    });
    expect(products).toHaveLength(1);
    expect(methods).toEqual(["GET"]);
  });

  test("registers every requested source kind", () => {
    expect(implementedSourceKinds()).toEqual(["ecwid", "shopify", "marktplaats", "ibood", "2dekansje", "retoertje"]);
  });
});
