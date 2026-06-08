import { describe, expect, test } from "bun:test";
import { diffJson } from "../src/shared/json-diff.ts";

describe("json diff", () => {
  test("emits atomic JSON pointer changes", () => {
    expect(diffJson({ id: 1, price: 10, nested: { x: true }, gone: "yes" }, { id: 1, price: 12, nested: { x: false }, added: "new" })).toEqual([
      { op: "add", path: "/added", after: "new" },
      { op: "remove", path: "/gone", before: "yes" },
      { op: "replace", path: "/nested/x", before: true, after: false },
      { op: "replace", path: "/price", before: 10, after: 12 }
    ]);
  });

  test("escapes JSON pointer path segments", () => {
    expect(diffJson({ "a/b": 1, "x~y": 2 }, { "a/b": 3, "x~y": 2 })).toEqual([
      { op: "replace", path: "/a~1b", before: 1, after: 3 }
    ]);
  });
});
