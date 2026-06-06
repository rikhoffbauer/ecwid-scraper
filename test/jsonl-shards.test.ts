import { describe, expect, test } from "bun:test";
import { splitJsonlRecords } from "../src/jsonl-shards.ts";
import { createdEvent, eventJsonlShards } from "../src/events.ts";

describe("JSONL sharding", () => {
  test("splits records by UTF-8 byte budget and keeps deterministic part names", () => {
    const shards = splitJsonlRecords({
      records: [{ id: 1, value: "aaaa" }, { id: 2, value: "bbbb" }, { id: 3, value: "cccc" }],
      fileStem: "abc123",
      maxBytes: 30,
      render: (record) => JSON.stringify(record)
    });

    expect(shards.length).toBeGreaterThan(1);
    expect(shards.map((shard) => shard.fileName)).toEqual([
      "abc123.part-00001-of-00003.jsonl",
      "abc123.part-00002-of-00003.jsonl",
      "abc123.part-00003-of-00003.jsonl"
    ]);
    expect(shards.every((shard) => shard.byteLength < 100 * 1024 * 1024)).toBe(true);
  });

  test("keeps the old single digest filename when only one shard is needed", () => {
    const event = createdEvent(
      { storeId: "store-1", productId: "1", runId: "run-1", observedAt: "2026-06-06T00:00:00Z" },
      { id: 1, name: "Small" },
      "hash-1"
    );
    const shards = eventJsonlShards([event]);

    expect(shards).toHaveLength(1);
    expect(shards[0]!.fileName).toMatch(/^[a-f0-9]{16}\.jsonl$/);
    expect(shards[0]!.records).toEqual([event]);
  });
});
