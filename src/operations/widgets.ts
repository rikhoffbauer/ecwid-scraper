import type { JsonObject } from "../types.ts";

export interface ProductWidgetItem {
  sourceId: string;
  productId: string;
  name: string;
  price?: number;
  imageUrl?: string;
  url?: string;
  storeName?: string;
}

export type AssistantWidget =
  | { type: "product"; product: ProductWidgetItem; label?: string }
  | { type: "product-list"; title: string; products: ProductWidgetItem[] }
  | { type: "comparison"; title: string; products: ProductWidgetItem[]; bestProductId?: string }
  | { type: "price-history"; title: string; currency?: string; points: Array<{ at: string; value: number }> }
  | { type: "event-list"; title: string; events: Array<{ eventType: string; observedAt: string; productId: string; path?: string }> }
  | { type: "analysis-summary"; title: string; metrics: Array<{ label: string; value: string; tone?: "default" | "positive" | "warning" }> }
  | { type: "action-result"; title: string; detail?: string; tone: "success" | "error"; undo?: { action: string; input: Record<string, unknown> } }
  | { type: "artifact"; title: string; url: string; mediaType?: string };

export interface AssistantMessageMetadata {
  responseId?: string;
  toolCalls?: Array<{ name: string; input: unknown; output: unknown }>;
  widgets?: AssistantWidget[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function productItem(product: JsonObject, fallbackSourceId = "unknown"): ProductWidgetItem {
  const summary = isRecord(product.summary) ? product.summary : product;
  const firstString = (...values: unknown[]) => values.find((value): value is string => typeof value === "string" && !!value);
  const firstNumber = (...values: unknown[]) => values.find((value): value is number => typeof value === "number");
  return {
    sourceId: firstString(product.sourceId, product.storeId, fallbackSourceId) ?? fallbackSourceId,
    productId: String(product.externalId ?? product.productId ?? product.id ?? "unknown"),
    name: firstString(summary.name, summary.title, product.name, product.title) ?? "Untitled product",
    price: firstNumber(summary.price, summary.defaultDisplayedPrice, product.price, product.defaultDisplayedPrice),
    imageUrl: firstString(summary.imageUrl, summary.thumbnailUrl, product.imageUrl, product.thumbnailUrl),
    url: firstString(summary.url, product.url),
    storeName: firstString(product.storeName, product.sourceName)
  };
}

export function widgetsForToolCall(name: string, input: Record<string, unknown>, output: unknown): AssistantWidget[] {
  if (name === "products.search" && Array.isArray(output)) {
    return [{ type: "product-list", title: `Results for “${String(input.query ?? "")}”`, products: output.slice(0, 8).filter(isRecord).map((item) => productItem(item as JsonObject)) }];
  }
  if (name === "products.compare" && Array.isArray(output)) {
    const products = output.slice(0, 8).filter(isRecord).map((item) => productItem(item as JsonObject));
    const priced = products.filter((item): item is ProductWidgetItem & { price: number } => typeof item.price === "number");
    const best = priced.sort((a, b) => a.price - b.price)[0];
    return [{ type: "comparison", title: "Compare across stores", products, bestProductId: best?.productId }];
  }
  if (name === "events.recent" && Array.isArray(output)) {
    return [{
      type: "event-list",
      title: "Recent product activity",
      events: output.slice(0, 12).filter(isRecord).map((event) => ({
        eventType: String(event.eventType ?? "event"),
        observedAt: String(event.observedAt ?? ""),
        productId: String(event.productId ?? ""),
        path: typeof event.path === "string" ? event.path : undefined
      }))
    }];
  }
  if (name === "flags.add" && isRecord(output)) {
    return [{
      type: "action-result",
      title: `Added ${String(output.label ?? "product")} flag`,
      detail: typeof output.rationale === "string" ? output.rationale : undefined,
      tone: "success",
      undo: {
        action: "flags.remove",
        input: { sourceId: output.sourceId, productId: output.productId, label: output.label }
      }
    }];
  }
  if (name === "flags.remove") {
    return [{ type: "action-result", title: "Removed product flag", tone: "success" }];
  }
  return [];
}

export function isAssistantWidget(value: unknown): value is AssistantWidget {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  switch (value.type) {
    case "product":
      return isRecord(value.product);
    case "product-list":
    case "comparison":
      return typeof value.title === "string" && Array.isArray(value.products);
    case "price-history":
      return typeof value.title === "string" && Array.isArray(value.points);
    case "event-list":
      return typeof value.title === "string" && Array.isArray(value.events);
    case "analysis-summary":
      return typeof value.title === "string" && Array.isArray(value.metrics);
    case "action-result":
      return typeof value.title === "string" && (value.tone === "success" || value.tone === "error");
    case "artifact":
      return typeof value.title === "string" && typeof value.url === "string";
    default:
      return false;
  }
}

export function normalizeAssistantMetadata(value: unknown): AssistantMessageMetadata {
  if (!isRecord(value)) return {};
  return {
    responseId: typeof value.responseId === "string" ? value.responseId : undefined,
    toolCalls: Array.isArray(value.toolCalls) ? value.toolCalls.filter(isRecord).map((call) => ({
      name: String(call.name ?? ""),
      input: call.input,
      output: call.output
    })) : undefined,
    widgets: Array.isArray(value.widgets) ? value.widgets.filter(isAssistantWidget) : undefined
  };
}
