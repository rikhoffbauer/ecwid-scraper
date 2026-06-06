import { describe, expect, test } from "bun:test";
import { stableStringify, sha256Json } from "../src/canonical-json.ts";

describe("canonical JSON", () => {
  test("sorts object keys recursively", () => {
    const a = { z: 1, a: { b: 2, a: 1 } };
    const b = { a: { a: 1, b: 2 }, z: 1 };
    expect(stableStringify(a)).toBe(stableStringify(b));
    expect(sha256Json(a)).toBe(sha256Json(b));
  });
});
