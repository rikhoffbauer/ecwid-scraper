import { ecwidSourceAdapter } from "./ecwid.ts";
import { iboodSourceAdapter } from "./ibood.ts";
import { createMarktplaatsAdapter } from "./marktplaats.ts";
import { shopifySourceAdapter } from "./shopify.ts";
import { createRetoertjeAdapter } from "./retoertje.ts";
import { createTweedekansjeAdapter } from "./2dekansje.ts";
import { createGeneratedSourceAdapter } from "./generated.ts";
import type { ReadOnlySourceAdapter, SourceKind } from "./types.ts";
import type { StoreConfig } from "../../shared/types.ts";

const adapters = new Map<SourceKind, ReadOnlySourceAdapter<never>>([
  ["ecwid", ecwidSourceAdapter as ReadOnlySourceAdapter<never>],
  ["shopify", shopifySourceAdapter as ReadOnlySourceAdapter<never>],
  ["marktplaats", createMarktplaatsAdapter() as ReadOnlySourceAdapter<never>],
  ["ibood", iboodSourceAdapter as ReadOnlySourceAdapter<never>],
  ["2dekansje", createTweedekansjeAdapter() as ReadOnlySourceAdapter<never>],
  ["retoertje", createRetoertjeAdapter() as ReadOnlySourceAdapter<never>]
]);

export function sourceAdapter(kind: SourceKind): ReadOnlySourceAdapter<never> {
  const adapter = adapters.get(kind);
  if (!adapter) throw new Error(`Source adapter ${kind} is not implemented`);
  return adapter;
}

export function sourceAdapterForStore(store: StoreConfig, cwd = process.cwd()): ReadOnlySourceAdapter<never> {
  if (store.kind === "generated") return createGeneratedSourceAdapter(store, cwd) as ReadOnlySourceAdapter<never>;
  return sourceAdapter((store.kind ?? "ecwid") as SourceKind);
}

export function implementedSourceKinds(): SourceKind[] {
  return [...adapters.keys()];
}
