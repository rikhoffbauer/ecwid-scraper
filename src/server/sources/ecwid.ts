import { fetchAllProducts, type FetchAllProductsOptions } from "../ecwid.ts";
import type { StoreConfig } from "../../shared/types.ts";
import { offeringFromEcwid } from "./canonical.ts";
import type { ReadOnlySourceAdapter } from "./types.ts";

export const ecwidSourceAdapter: ReadOnlySourceAdapter<StoreConfig & { fetchOptions?: FetchAllProductsOptions }> = {
  kind: "ecwid",
  async *fetchProducts(config, context) {
    for await (const chunk of fetchAllProducts(config, {
      ...config.fetchOptions,
      fetchImpl: (input, init) => context.http.fetch(input, init)
    })) {
      yield chunk.map((product) => offeringFromEcwid(config.id, product));
    }
  },
  async *searchProducts(config, input, context) {
    for await (const chunk of fetchAllProducts({
      ...config,
      extraQuery: { ...config.extraQuery, keyword: input.query }
    }, {
      ...config.fetchOptions,
      fetchImpl: (request, init) => context.http.fetch(request, init)
    })) {
      yield chunk.map((product) => offeringFromEcwid(config.id, product));
    }
  }
};
