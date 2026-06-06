import { normalizeJson, sha256Json, sha256Text, stableStringify } from "./canonical-json.ts";
import { splitJsonlRecords, type JsonlShard } from "./jsonl-shards.ts";
import type { JsonChange } from "./json-diff.ts";
import type { JsonObject, ProductEvent } from "./types.ts";

interface EventContext {
  storeId: string;
  productId: string;
  runId: string;
  observedAt: string;
}

function deterministicEventId(parts: unknown[]): string {
  return sha256Text(stableStringify(parts as never)).slice(0, 32);
}

export function createdEvent(context: EventContext, product: JsonObject, currentHash: string): ProductEvent {
  return {
    eventId: deterministicEventId(["product.created", context.storeId, context.productId, currentHash]),
    eventType: "product.created",
    schemaVersion: 1,
    source: "ecwid",
    storeId: context.storeId,
    productId: context.productId,
    runId: context.runId,
    observedAt: context.observedAt,
    currentHash,
    product
  };
}

export function deletedEvent(context: EventContext, product: JsonObject, previousHash: string): ProductEvent {
  return {
    eventId: deterministicEventId(["product.deleted", context.storeId, context.productId, previousHash]),
    eventType: "product.deleted",
    schemaVersion: 1,
    source: "ecwid",
    storeId: context.storeId,
    productId: context.productId,
    runId: context.runId,
    observedAt: context.observedAt,
    previousHash,
    product
  };
}

export function fieldChangedEvents(
  context: EventContext,
  changes: JsonChange[],
  previousHash: string,
  currentHash: string
): ProductEvent[] {
  return changes.map((change) => ({
    eventId: deterministicEventId([
      "product.field_changed",
      context.storeId,
      context.productId,
      change.op,
      change.path,
      previousHash,
      currentHash,
      change.before,
      change.after
    ]),
    eventType: "product.field_changed",
    schemaVersion: 1,
    source: "ecwid",
    storeId: context.storeId,
    productId: context.productId,
    runId: context.runId,
    observedAt: context.observedAt,
    previousHash,
    currentHash,
    op: change.op,
    path: change.path,
    ...(Object.prototype.hasOwnProperty.call(change, "before") ? { before: change.before } : {}),
    ...(Object.prototype.hasOwnProperty.call(change, "after") ? { after: change.after } : {})
  }));
}

export function eventRunDigest(events: ProductEvent[]): string {
  return sha256Json(events.map((event) => event.eventId).sort() as never).slice(0, 16);
}

export function eventJsonl(events: ProductEvent[]): string {
  return events.map((event) => JSON.stringify(normalizeJson(event as never))).join("\n") + "\n";
}

export function eventJsonlShards(events: ProductEvent[], maxBytes?: number): JsonlShard<ProductEvent>[] {
  return splitJsonlRecords({
    records: events,
    fileStem: eventRunDigest(events),
    maxBytes,
    render: (event) => JSON.stringify(normalizeJson(event as never))
  });
}
