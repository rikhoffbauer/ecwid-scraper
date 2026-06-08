import type { JsonObject, ProductEvent } from "../../shared/types.ts";
import { ActionRegistry } from "./actions.ts";
import type { AssistantAnalyzer } from "./assistant-analyzer.ts";
import { OperationsDatabase } from "./database.ts";

function eventProduct(event: ProductEvent): JsonObject | null {
  return "product" in event ? event.product : null;
}

export async function runAutomationsForEvents(params: {
  db: OperationsDatabase;
  actions: ActionRegistry;
  assistant: AssistantAnalyzer;
  events: ProductEvent[];
  products: JsonObject[];
}): Promise<Array<{ ruleId: number; eventId: string; status: "succeeded" | "failed"; output?: unknown; error?: string }>> {
  const results: Array<{ ruleId: number; eventId: string; status: "succeeded" | "failed"; output?: unknown; error?: string }> = [];
  for (const event of params.events) {
    if (!["product.created", "product.field_changed"].includes(event.eventType)) continue;
    for (const rule of params.db.listRules(true)) {
      if (rule.eventTypes.length && !rule.eventTypes.includes(event.eventType)) continue;
      if (rule.sourceIds.length && !rule.sourceIds.includes(event.storeId)) continue;
      if (params.db.hasAutomationRun(rule.id, event.eventId)) continue;
      try {
        const decision = await params.assistant.analyze({ rule, event, product: eventProduct(event), trackedProducts: params.products });
        const actionOutputs = [];
        for (const action of decision.actions) {
          actionOutputs.push(await params.actions.execute(action.name, action.input, { db: params.db, actor: `automation:${rule.id}`, products: params.products }));
        }
        const output = { decision, actionOutputs };
        params.db.recordAutomationRun({ ruleId: rule.id, eventId: event.eventId, sourceId: event.storeId, productId: event.productId, status: "succeeded", output });
        results.push({ ruleId: rule.id, eventId: event.eventId, status: "succeeded", output });
      } catch (error) {
        const message = (error as Error).message;
        params.db.recordAutomationRun({ ruleId: rule.id, eventId: event.eventId, sourceId: event.storeId, productId: event.productId, status: "failed", error: message });
        results.push({ ruleId: rule.id, eventId: event.eventId, status: "failed", error: message });
      }
    }
  }
  return results;
}
