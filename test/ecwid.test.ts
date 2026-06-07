import { describe, expect, test } from "bun:test";
import { fetchAllProducts } from "../src/ecwid.ts";
import type { StoreConfig } from "../src/types.ts";

const store: StoreConfig = {
  id: "store-1",
  token: "secret",
  limit: 2,
  requestDelayMs: 0
};

describe("fetchAllProducts", () => {
  test("refetches the catalog after products repeat across offset pages", async () => {
    const pages = [
      { total: 4, count: 2, offset: 0, items: [{ id: 1, name: "one" }, { id: 2, name: "old" }] },
      { total: 4, count: 2, offset: 2, items: [{ id: 2, name: "new" }, { id: 3, name: "three" }] },
      { total: 3, count: 2, offset: 0, items: [{ id: 2, name: "new" }, { id: 3, name: "three" }] },
      { total: 3, count: 1, offset: 2, items: [{ id: 4, name: "four" }] },
      { total: 3, count: 2, offset: 0, items: [{ id: 2, name: "new" }, { id: 3, name: "three" }] },
      { total: 3, count: 1, offset: 2, items: [{ id: 4, name: "four" }] }
    ];

    const products = await fetchAllProducts(store, {
      fetchImpl: (async () => new Response(JSON.stringify(pages.shift()), { status: 200 })) as unknown as typeof fetch
    });

    expect(products).toEqual([
      { id: 2, name: "new" },
      { id: 3, name: "three" },
      { id: 4, name: "four" }
    ]);
    expect(pages).toHaveLength(0);
  });

  test("fails instead of committing a catalog that does not stabilize", async () => {
    let request = 0;
    const fetchImpl = (async (input: URL | RequestInfo) => {
      const offset = Number(new URL(String(input)).searchParams.get("offset"));
      request += 1;
      const items = offset === 0
        ? [{ id: 1, revision: request }, { id: 2, revision: request }]
        : [{ id: 2, revision: request }, { id: 3, revision: request }];
      return new Response(JSON.stringify({ total: 4, count: 2, offset, items }), { status: 200 });
    }) as unknown as typeof fetch;

    expect(fetchAllProducts(store, { fetchImpl })).rejects.toThrow(/did not stabilize after 4 fetch passes/);
  });
});
