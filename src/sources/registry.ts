import { ecwidSourceAdapter } from "./ecwid.ts";
import { createJsonLdMarketplaceAdapter } from "./json-ld-marketplace.ts";
import { shopifySourceAdapter } from "./shopify.ts";
import type { ReadOnlySourceAdapter, SourceKind } from "./types.ts";

const adapters = new Map<SourceKind, ReadOnlySourceAdapter<never>>([
  ["ecwid", ecwidSourceAdapter as ReadOnlySourceAdapter<never>],
  ["shopify", shopifySourceAdapter as ReadOnlySourceAdapter<never>],
  ["marktplaats", createJsonLdMarketplaceAdapter("marktplaats") as ReadOnlySourceAdapter<never>],
  ["ibood", createJsonLdMarketplaceAdapter("ibood") as ReadOnlySourceAdapter<never>],
  ["2dekansje", createJsonLdMarketplaceAdapter("2dekansje") as ReadOnlySourceAdapter<never>],
  ["retoertje", createJsonLdMarketplaceAdapter("retoertje") as ReadOnlySourceAdapter<never>]
]);

export function sourceAdapter(kind: SourceKind): ReadOnlySourceAdapter<never> {
  const adapter = adapters.get(kind);
  if (!adapter) throw new Error(`Source adapter ${kind} is not implemented`);
  return adapter;
}

export function implementedSourceKinds(): SourceKind[] {
  return [...adapters.keys()];
}
