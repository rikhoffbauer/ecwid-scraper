import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { assertPublicHttpUrl, createGeneratedSourceAdapter, runGeneratedOperation, screenGeneratedAdapter } from "../src/server/sources/generated.ts";
import type { GeneratedPageResult } from "../src/server/sources/types.ts";

const config = { id: "generated-shop", kind: "generated" as const, url: "https://example.com/catalog" };

function tempAdapter(source: string): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "generated-source-test-"));
  mkdirSync(root, { recursive: true });
  const file = path.join(root, "adapter.ts");
  writeFileSync(file, source);
  return file;
}

describe("generated source runner", () => {
  test("screens dangerous host access and missing exports", () => {
    expect(screenGeneratedAdapter("export async function fetchCatalogPage(){ return fetch('https://example.com') }")).toEqual(expect.arrayContaining([
      expect.stringContaining("direct fetch"),
      expect.stringContaining("fetchProduct"),
      expect.stringContaining("fetchSearchResults")
    ]));
    expect(screenGeneratedAdapter("process.exit()")).toContain("Generated adapter contains forbidden host runtime access");
    expect(() => assertPublicHttpUrl("http://127.0.0.1/private")).toThrow(/public/);
  });

  test("executes a screened adapter in a child process", async () => {
    const file = tempAdapter(`
export async function fetchCatalogPage({config,url,pageNumber}, context) {
  return { products: [{ sourceId: config.id, sourceKind: "generated", externalId: String(pageNumber), title: "Product", url, imageUrls: [], availability: "available", categories: [], attributes: {}, raw: { pageNumber } }] };
}
export async function fetchProduct() { return null; }
export async function fetchSearchResults() { return { products: [] }; }
`);
    const result = await runGeneratedOperation<GeneratedPageResult>(file, {
      operation: "catalog",
      input: { config, url: config.url, pageNumber: 2 }
    });
    expect(result.products[0]).toMatchObject({ sourceId: "generated-shop", externalId: "2" });
  });

  test("enforces read-only HTTP inside the child process", async () => {
    const file = tempAdapter(`
export async function fetchCatalogPage({config,url}, context) { await context.http.fetch(url, { method: "POST" }); return { products: [] }; }
export async function fetchProduct() { return null; }
export async function fetchSearchResults() { return { products: [] }; }
`);
    await expect(runGeneratedOperation(file, {
      operation: "catalog",
      input: { config, url: config.url, pageNumber: 1 }
    })).rejects.toThrow(/read-only/);
  });

  test("uses the generated pagination and search contract", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "generated-adapter-test-"));
    const directory = path.join(root, ".ecwid-sync", "adapters", "generated-shop");
    mkdirSync(directory, { recursive: true });
    writeFileSync(path.join(directory, "adapter.ts"), `
function product(config,id,url) { return { sourceId: config.id, sourceKind: "generated", externalId: id, title: id, url, imageUrls: [], availability: "available", categories: [], attributes: {}, raw: { id } }; }
export async function fetchCatalogPage({config,url,pageNumber}, context) { return { products: [product(config,String(pageNumber),url)], nextPageUrl: pageNumber === 1 ? "https://example.com/catalog?page=2" : undefined }; }
export async function fetchProduct() { return null; }
export async function fetchSearchResults({config,url,query}, context) { return { products: [product(config,query,url)] }; }
`);
    const store = {
      id: "generated-shop", kind: "generated", adapterId: "generated-shop", url: config.url,
      onboarding: { catalogUrl: config.url, catalogPageNumber: 1, productUrl: "https://example.com/product", searchUrl: "https://example.com/search", searchQuery: "chair" }
    };
    const source = createGeneratedSourceAdapter(store, root);
    const catalog = [];
    for await (const chunk of source.fetchProducts(store, { http: { fetch } })) catalog.push(...chunk);
    const search = [];
    for await (const chunk of source.searchProducts!(store, { query: "chair" }, { http: { fetch } })) search.push(...chunk);
    expect(catalog.map((product) => product.externalId)).toEqual(["1", "2"]);
    expect(search[0]?.externalId).toBe("chair");
  });
});
