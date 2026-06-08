import { describe, expect, test } from "bun:test";
import { nextInfiniteCount } from "../src/client/hooks.ts";

describe("infinite catalogue loading", () => {
  test("loads the next chunk without exceeding the filtered total", () => {
    expect(nextInfiniteCount(80, 250)).toBe(160);
    expect(nextInfiniteCount(240, 250)).toBe(250);
    expect(nextInfiniteCount(20, 20)).toBe(20);
  });
});
