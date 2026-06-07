import { fetchAllProducts, type FetchAllProductsOptions } from "../ecwid.ts";
import type { StoreConfig } from "../types.ts";
import { canonicalFromEcwid } from "./canonical.ts";
import type { ReadOnlySourceAdapter } from "./types.ts";

export const ecwidSourceAdapter: ReadOnlySourceAdapter<StoreConfig & { fetchOptions?: FetchAllProductsOptions }> = {
  kind: "ecwid",
  async *fetchProducts(config, context) {
    for await (const chunk of fetchAllProducts(config, {
      ...config.fetchOptions,
      fetchImpl: (input, init) => context.http.fetch(input, init)
    })) {
      yield chunk.map((product) => canonicalFromEcwid(config.id, product));
    }
  }
};
