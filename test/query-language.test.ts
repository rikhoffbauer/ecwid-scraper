import { describe, expect, test } from "bun:test";
import { compileProductQuery } from "../web/src/query-language.ts";

const ctx = {
  storeId: "99490018",
  name: "Black Cotton Hoodie",
  sku: "HOOD-001",
  price: 29.95,
  enabled: true,
  category: "Apparel Hoodies"
};
const text = "99490018 black cotton hoodie hood-001 apparel hoodies";

describe("product query language", () => {
  test("simple text query falls back to full-text search", () => {
    expect(compileProductQuery("cotton hoodie").matches(ctx, text)).toBe(true);
    expect(compileProductQuery("leather").matches(ctx, text)).toBe(false);
  });

  test("supports boolean, comparison, arithmetic and grouping", () => {
    expect(compileProductQuery('storeId == "99490018" && price >= 20 && (price * 2) < 70').matches(ctx, text)).toBe(true);
    expect(compileProductQuery('storeId == "x" || !(price >= 20)').matches(ctx, text)).toBe(false);
  });

  test("supports pattern and regex matching", () => {
    expect(compileProductQuery('sku ^= "HOOD" && name *= cotton').matches(ctx, text)).toBe(true);
    expect(compileProductQuery('name ~= /hoodie$/i').matches(ctx, text)).toBe(true);
    expect(compileProductQuery('category |= Apparel').matches(ctx, text)).toBe(true);
  });

  test("returns parse errors instead of throwing", () => {
    const compiled = compileProductQuery("price >= (");
    expect(compiled.error).toBeTruthy();
    expect(compiled.matches(ctx, text)).toBe(false);
  });
});
