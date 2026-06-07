import { describe, expect, test } from "bun:test";
import { isAssistantWidget, normalizeAssistantMetadata, widgetsForToolCall } from "../src/operations/widgets.ts";

describe("assistant widgets", () => {
  test("maps trusted tool outputs to compact widgets", () => {
    const widgets = widgetsForToolCall("products.search", { query: "chair" }, [
      { id: "1", storeId: "shop", name: "Oak chair", price: 49 }
    ]);
    expect(widgets).toEqual([expect.objectContaining({
      type: "product-list",
      products: [expect.objectContaining({ productId: "1", sourceId: "shop", name: "Oak chair", price: 49 })]
    })]);
  });

  test("rejects malformed widget metadata", () => {
    expect(isAssistantWidget({ type: "comparison", products: [] })).toBe(false);
    expect(normalizeAssistantMetadata({ widgets: [{ type: "comparison", products: [] }, { type: "action-result", title: "Done", tone: "success" }] }).widgets).toHaveLength(1);
  });

  test("includes reversible undo metadata for internal flags", () => {
    const widgets = widgetsForToolCall("flags.add", {}, { sourceId: "s", productId: "p", label: "value", rationale: "Below median" });
    expect(widgets[0]).toMatchObject({ type: "action-result", undo: { action: "flags.remove", input: { sourceId: "s", productId: "p", label: "value" } } });
  });
});
