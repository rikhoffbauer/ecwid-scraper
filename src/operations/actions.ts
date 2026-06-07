import type { JsonObject } from "../types.ts";
import type { ProductEvent } from "../types.ts";
import { OperationsDatabase } from "./database.ts";

export interface ActionContext {
  db: OperationsDatabase;
  actor: string;
  products: JsonObject[];
}

export interface InternalAction {
  name: string;
  description: string;
  execute(input: Record<string, unknown>, context: ActionContext): Promise<unknown>;
}

export class ActionRegistry {
  private readonly actions = new Map<string, InternalAction>();

  register(action: InternalAction): void {
    if (this.actions.has(action.name)) throw new Error(`Action ${action.name} is already registered`);
    this.actions.set(action.name, action);
  }

  list(): Array<Pick<InternalAction, "name" | "description">> {
    return [...this.actions.values()].map(({ name, description }) => ({ name, description }));
  }

  async execute(name: string, input: Record<string, unknown>, context: ActionContext): Promise<unknown> {
    const action = this.actions.get(name);
    if (!action) throw new Error(`Unknown action ${name}`);
    try {
      const output = await action.execute(input, context);
      context.db.recordAudit({ action: name, actor: context.actor, input, output, status: "succeeded" });
      return output;
    } catch (error) {
      context.db.recordAudit({ action: name, actor: context.actor, input, output: undefined, status: "failed", error: (error as Error).message });
      throw error;
    }
  }
}

function stringInput(input: Record<string, unknown>, name: string): string {
  const value = input[name];
  if (typeof value !== "string" || !value.trim()) throw new Error(`${name} must be a non-empty string`);
  return value.trim();
}

function productId(product: JsonObject): string {
  return String(product.id);
}

function productPrice(product: JsonObject): number | undefined {
  return typeof product.price === "number" ? product.price : typeof product.defaultDisplayedPrice === "number" ? product.defaultDisplayedPrice : undefined;
}

export function createDefaultActionRegistry(): ActionRegistry {
  const registry = new ActionRegistry();
  registry.register({
    name: "products.search",
    description: "Search tracked products by text.",
    async execute(input, context) {
      const query = stringInput(input, "query").toLowerCase();
      return context.products.filter((product) => JSON.stringify(product).toLowerCase().includes(query)).slice(0, 100);
    }
  });
  registry.register({
    name: "products.compare",
    description: "Find likely matching tracked products by product name, SKU, or identifier.",
    async execute(input, context) {
      const query = stringInput(input, "query").toLowerCase();
      return context.products.filter((product) => JSON.stringify(product).toLowerCase().includes(query)).slice(0, 20);
    }
  });
  registry.register({
    name: "events.recent",
    description: "Read recent tracked product events.",
    async execute(input, context) {
      const sourceId = typeof input.sourceId === "string" ? input.sourceId : undefined;
      const limit = typeof input.limit === "number" ? Math.max(1, Math.min(100, Math.floor(input.limit))) : 20;
      return context.db.listEvents(sourceId).slice(-limit).reverse();
    }
  });
  registry.register({
    name: "flags.add",
    description: "Add or update an internal flag on a tracked product.",
    async execute(input, context) {
      return context.db.addFlag({
        sourceId: stringInput(input, "sourceId"),
        productId: stringInput(input, "productId"),
        label: stringInput(input, "label"),
        rationale: typeof input.rationale === "string" ? input.rationale : "",
        confidence: typeof input.confidence === "number" ? input.confidence : null,
        createdBy: context.actor
      });
    }
  });
  registry.register({
    name: "flags.remove",
    description: "Undo an internal product flag. This never changes a source store.",
    async execute(input, context) {
      return context.db.removeFlag(stringInput(input, "sourceId"), stringInput(input, "productId"), stringInput(input, "label"));
    }
  });
  return registry;
}

export function eventProduct(event: ProductEvent): JsonObject | null {
  return "product" in event ? event.product : null;
}
