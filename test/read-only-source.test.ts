import { describe, expect, test } from "bun:test";
import { createReadOnlyHttpClient } from "../src/sources/read-only-http.ts";
import { ecwidSourceAdapter } from "../src/sources/ecwid.ts";

describe("read-only source HTTP", () => {
  test("allows GET and HEAD requests", async () => {
    const methods: string[] = [];
    const http = createReadOnlyHttpClient((async (_input, init) => {
      methods.push(init?.method ?? "GET");
      return new Response(null, { status: 200 });
    }) as typeof fetch);

    await http.fetch("https://example.com/products");
    await http.fetch("https://example.com/products", { method: "HEAD" });
    expect(methods).toEqual(["GET", "HEAD"]);
  });

  test("rejects every source write method before network access", async () => {
    let calls = 0;
    const http = createReadOnlyHttpClient((async () => {
      calls += 1;
      return new Response(null, { status: 200 });
    }) as unknown as typeof fetch);

    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      expect(() => http.fetch("https://example.com/products", { method })).toThrow(/read-only/);
    }
    expect(calls).toBe(0);
  });

  test("routes Ecwid ingestion through the read-only client", async () => {
    const methods: string[] = [];
    const http = createReadOnlyHttpClient((async (_input, init) => {
      methods.push(init?.method ?? "GET");
      return Response.json({ total: 1, count: 1, offset: 0, limit: 200, items: [{ id: 1, name: "Tracked" }] });
    }) as typeof fetch);

    const products = await ecwidSourceAdapter.fetchProducts({
      id: "store-1",
      token: "read-token",
      requestDelayMs: 0
    }, { http });

    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject({
      sourceId: "store-1",
      sourceKind: "ecwid",
      externalId: "1",
      title: "Tracked",
      raw: { id: 1, name: "Tracked" }
    });
    expect(methods).toEqual(["GET"]);
  });
});
