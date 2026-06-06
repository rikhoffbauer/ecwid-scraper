import { describe, expect, test } from "bun:test";
import { parseProductMutationBatch } from "../src/product-mutations.ts";

describe("product mutation requests", () => {
  test("parses upsert and delete operations", () => {
    const request = parseProductMutationBatch({
      schemaVersion: 1,
      kind: "ecwid-product-mutation-batch",
      source: "web-ui",
      requestId: "request-1",
      storeId: "store-1",
      requestedAt: "2026-06-06T00:00:00Z",
      operations: [
        { op: "upsert", product: { id: 1, name: "A" } },
        { op: "delete", productId: "2" }
      ]
    });

    expect(request.operations[0]).toMatchObject({ op: "upsert", productId: "1" });
    expect(request.operations[1]).toMatchObject({ op: "delete", productId: "2" });
  });

  test("rejects duplicate product ids", () => {
    expect(() => parseProductMutationBatch({
      schemaVersion: 1,
      kind: "ecwid-product-mutation-batch",
      requestId: "request-1",
      storeId: "store-1",
      requestedAt: "2026-06-06T00:00:00Z",
      operations: [
        { op: "upsert", product: { id: "same", name: "A" } },
        { op: "delete", productId: "same" }
      ]
    })).toThrow(/duplicate product id same/);
  });

  test("rejects mismatched product ids", () => {
    expect(() => parseProductMutationBatch({
      schemaVersion: 1,
      kind: "ecwid-product-mutation-batch",
      requestId: "request-1",
      storeId: "store-1",
      requestedAt: "2026-06-06T00:00:00Z",
      operations: [
        { op: "upsert", productId: "outer", product: { id: "inner", name: "A" } }
      ]
    })).toThrow(/productId does not match/);
  });
});
