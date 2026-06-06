import { stableStringify, sha256Text } from "./json";
import type { ProductEvent } from "./types";
import type { JsonChange } from "./diff";

async function eventId(parts: unknown[]): Promise<string> {
  return (await sha256Text(stableStringify(parts))).slice(0, 32);
}

export async function createdEvent(ctx: { storeId: string; productId: string; runId: string; observedAt: string }, product: Record<string, unknown>, currentHash: string): Promise<ProductEvent> {
  return { eventId: await eventId(["product.created", ctx.storeId, ctx.productId, currentHash]), eventType: "product.created", schemaVersion: 1, source: "ecwid", storeId: ctx.storeId, productId: ctx.productId, runId: ctx.runId, observedAt: ctx.observedAt, currentHash, product };
}

export async function deletedEvent(ctx: { storeId: string; productId: string; runId: string; observedAt: string }, product: Record<string, unknown>, previousHash: string): Promise<ProductEvent> {
  return { eventId: await eventId(["product.deleted", ctx.storeId, ctx.productId, previousHash]), eventType: "product.deleted", schemaVersion: 1, source: "ecwid", storeId: ctx.storeId, productId: ctx.productId, runId: ctx.runId, observedAt: ctx.observedAt, previousHash, product };
}

export async function fieldChangedEvents(ctx: { storeId: string; productId: string; runId: string; observedAt: string }, changes: JsonChange[], previousHash: string, currentHash: string): Promise<ProductEvent[]> {
  return Promise.all(changes.map(async (change) => ({
    eventId: await eventId(["product.field_changed", ctx.storeId, ctx.productId, change.op, change.path, previousHash, currentHash, change.before, change.after]),
    eventType: "product.field_changed" as const,
    schemaVersion: 1,
    source: "ecwid" as const,
    storeId: ctx.storeId,
    productId: ctx.productId,
    runId: ctx.runId,
    observedAt: ctx.observedAt,
    previousHash,
    currentHash,
    op: change.op,
    path: change.path,
    ...(Object.prototype.hasOwnProperty.call(change, "before") ? { before: change.before } : {}),
    ...(Object.prototype.hasOwnProperty.call(change, "after") ? { after: change.after } : {})
  })));
}

export async function eventRunDigest(events: ProductEvent[]): Promise<string> {
  return (await sha256Text(stableStringify(events.map((event) => event.eventId).sort()))).slice(0, 16);
}
