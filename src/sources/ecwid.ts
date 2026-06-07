import { fetchAllProducts, type FetchAllProductsOptions } from "../ecwid.ts";
import type { StoreConfig } from "../types.ts";
import { canonicalFromEcwid } from "./canonical.ts";
import type { ReadOnlySourceAdapter } from "./types.ts";

export const ecwidSourceAdapter: ReadOnlySourceAdapter<StoreConfig & { fetchOptions?: FetchAllProductsOptions }> = {
  kind: "ecwid",
  fetchProducts(config, context) {
    return fetchAllProducts(config, {
      ...config.fetchOptions,
      fetchImpl: (input, init) => context.http.fetch(input, init)
    }).then((products) => products.map((product) => canonicalFromEcwid(config.id, product)));
  }
};
