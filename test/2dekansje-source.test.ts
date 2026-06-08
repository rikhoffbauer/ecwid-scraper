import { describe, expect, test } from "bun:test";
import { createTweedekansjeAdapter } from "../src/server/sources/2dekansje.ts";
import { createReadOnlyHttpClient } from "../src/server/sources/read-only-http.ts";
import { implementedSourceKinds } from "../src/server/sources/registry.ts";

const config = {
  id: "2dekansje-test",
  kind: "2dekansje" as const,
  url: "https://www.2dekansje.com",
  enabled: true
};

const mockHomeHtml = `
<html>
  <body>
    <a href="/elektronica">Elektronica</a>
    <a href="/service/klachten">Klachten</a>
  </body>
</html>
`;

// Simulate Next.js __next_f stream style lines
const mockCategoryHtml = `
<html>
  <body>
    <script>
      self.__next_f.push([1, "10:{\\"id\\":\\"gid://shopify/Product/12345\\",\\"handle\\":\\"test-beugel\\",\\"title\\":\\"Test Beugel\\",\\"priceRange\\":\\"$11\\",\\"marketplacePrice\\":\\"$12\\",\\"totalInventory\\":5}\\n11:{\\"minVariantPrice\\":{\\"amount\\":\\"25.00\\",\\"currencyCode\\":\\"EUR\\"},\\"maxVariantPrice\\":{\\"amount\\":\\"25.00\\",\\"currencyCode\\":\\"EUR\\"}}\\n12:{\\"value\\":\\"{\\\\\\"amount\\\\\\":\\\\\\"35.00\\\\\\",\\\\\\"currency_code\\\\\\":\\\\\\"EUR\\\\\\"}\\"}\\n"]);
    </script>
    <script>
      self.__next_f.push([1, "{\\"pageInfo\\":{\\"endCursor\\":\\"eyJsYXN0X29mZnNldCI6MjN9\\",\\"hasNextPage\\":false}}\\n"]);
    </script>
  </body>
</html>
`;

describe("2dekansje source adapter", () => {
  test("is registered", () => {
    expect(implementedSourceKinds()).toContain("2dekansje");
  });

  test("fetches and parses products correctly", async () => {
    const urls: string[] = [];
    const adapter = createTweedekansjeAdapter();
    
    const stream = adapter.fetchProducts(config, {
      http: createReadOnlyHttpClient((async (input: string | URL | Request) => {
        const urlStr = input.toString();
        urls.push(urlStr);
        
        if (urlStr === "https://www.2dekansje.com/") {
          return new Response(mockHomeHtml, { headers: { "content-type": "text/html" } });
        }
        if (urlStr.includes("/elektronica")) {
          return new Response(mockCategoryHtml, { headers: { "content-type": "text/html" } });
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
      sourceId: "2dekansje-test",
      sourceKind: "2dekansje",
      externalId: "12345",
      title: "Test Beugel",
      url: "https://www.2dekansje.com/product/test-beugel/",
      price: 25.00,
      compareAtPrice: 35.00,
      currency: "EUR",
      availability: "available"
    }));
    
    expect(urls).toContain("https://www.2dekansje.com/");
    expect(urls).toContain("https://www.2dekansje.com/elektronica");
  });

  test("searches products via search endpoint", async () => {
    const urls: string[] = [];
    const adapter = createTweedekansjeAdapter();
    
    const stream = adapter.searchProducts!(config, { query: "laptop" }, {
      http: createReadOnlyHttpClient((async (input: string | URL | Request) => {
        const urlStr = input.toString();
        urls.push(urlStr);
        if (urlStr.includes("/search?q=laptop")) {
          return new Response(mockCategoryHtml, { headers: { "content-type": "text/html" } });
        }
        return new Response("Not Found", { status: 404 });
      }) as unknown as typeof fetch)
    });
    
    const products: any[] = [];
    for await (const chunk of stream) {
      products.push(...chunk);
    }
    
    expect(products).toHaveLength(1);
    expect(urls[0]).toContain("/search?q=laptop");
  });
});
