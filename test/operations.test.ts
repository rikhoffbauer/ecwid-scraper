import { afterEach, describe, expect, test } from "bun:test";
import { createDefaultActionRegistry } from "../src/operations/actions.ts";
import { runAutomationsForEvents } from "../src/operations/automations.ts";
import { OperationsDatabase } from "../src/operations/database.ts";
import type { JsonObject, ProductEvent } from "../src/types.ts";

const databases: OperationsDatabase[] = [];

afterEach(() => {
  for (const database of databases.splice(0)) database.close();
});

function database(): OperationsDatabase {
  const value = new OperationsDatabase(":memory:");
  databases.push(value);
  return value;
}

function products(): JsonObject[] {
  return [
    { id: "rare", name: "Rare value", price: 1 },
    { id: "2", name: "Two", price: 20 },
    { id: "3", name: "Three", price: 30 },
    { id: "4", name: "Four", price: 40 },
    { id: "5", name: "Five", price: 50 },
    { id: "6", name: "Six", price: 60 },
    { id: "7", name: "Seven", price: 70 },
    { id: "8", name: "Eight", price: 80 },
    { id: "9", name: "Nine", price: 90 },
    { id: "10", name: "Ten", price: 100 }
  ];
}

describe("operational actions and automations", () => {
  test("executes internal actions and records their audit trail", async () => {
    const db = database();
    const actions = createDefaultActionRegistry();
    const output = await actions.execute("flags.add", {
      sourceId: "source-1",
      productId: "rare",
      label: "review",
      rationale: "Interesting",
      confidence: 0.9
    }, { db, actor: "assistant", products: products() });

    expect(output).toMatchObject({ sourceId: "source-1", productId: "rare", label: "review" });
    expect(db.listFlags()).toHaveLength(1);
    expect(db.listAudit()).toEqual([expect.objectContaining({ action: "flags.add", actor: "assistant", status: "succeeded" })]);
  });

  test("runs exceptional-value automation once per event", async () => {
    const db = database();
    const actions = createDefaultActionRegistry();
    const rule = db.createRule({
      name: "Rare value",
      instruction: "flag any product offerings that are exceptional value for money (very rare)",
      eventTypes: ["product.created", "product.field_changed"],
      sourceIds: []
    });
    const event: ProductEvent = {
      eventId: "event-1",
      eventType: "product.created",
      schemaVersion: 1,
      source: "ecwid",
      storeId: "source-1",
      productId: "rare",
      runId: "run",
      observedAt: "2026-06-07T00:00:00Z",
      currentHash: "hash",
      product: { id: "rare", name: "Rare value", price: 1 }
    };

    const assistant = {
      async analyze() {
        return {
          summary: "AI researched comparable offerings and judged this exceptionally rare value.",
          actions: [{
            name: "flags.add",
            input: {
              sourceId: "source-1",
              productId: "rare",
              label: "exceptional-value",
              rationale: "AI comparison found this substantially below credible comparable offerings.",
              confidence: 0.91
            }
          }]
        };
      }
    };
    const first = await runAutomationsForEvents({ db, actions, assistant, events: [event], products: products() });
    const second = await runAutomationsForEvents({ db, actions, assistant, events: [event], products: products() });

    expect(first).toEqual([expect.objectContaining({ ruleId: rule.id, status: "succeeded" })]);
    expect(second).toEqual([]);
    expect(db.listFlags()).toEqual([expect.objectContaining({ label: "exceptional-value", productId: "rare" })]);
    expect(db.listAudit()).toHaveLength(1);
  });
});
