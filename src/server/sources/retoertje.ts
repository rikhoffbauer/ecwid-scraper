import type { JsonObject } from "../../shared/types.ts";
import type { ProductOfferingInput, ReadOnlySourceAdapter, SourceConfig } from "./types.ts";

export interface RetoertjeConfig extends SourceConfig {
  kind: "retoertje";
}

async function* crawlRetoertje(config: RetoertjeConfig, context: any, queue: string[], seenPaths: Set<string> = new Set()) {
  const baseUrl = config.url.replace(/\/$/, "");
  const seenProductIds = new Set<string>();

  while (queue.length > 0) {
    const currentPath = queue.shift()!;

    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const pageSuffix = page > 1 ? `/page${page}.html` : '/';
      // Clean up slash issues: make sure currentPath doesn't end or start with a slash
      const cleanPath = currentPath.replace(/^\//, "").replace(/\/$/, "");
      const url = `${baseUrl}/${cleanPath}${pageSuffix}?format=json&limit=100`;

      const response = await context.http.fetch(url, {
        headers: {
          "accept": "application/json",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        }
      });

      if (!response.ok) {
        break; // Skip failed category pages instead of failing the whole sync
      }

      const payload = await response.json() as any;

      // 1. If it's a category page listing subcategories, payload.catalog.categories will be present.
      // Add any new subcategories to the queue.
      if (payload.catalog && payload.catalog.categories) {
        for (const cat of Object.values(payload.catalog.categories) as any[]) {
          if (cat.url && !seenPaths.has(cat.url)) {
            queue.push(cat.url);
            seenPaths.add(cat.url);
          }
          if (cat.subs) {
            for (const sub of Object.values(cat.subs) as any[]) {
              if (sub.url && !seenPaths.has(sub.url)) {
                queue.push(sub.url);
                seenPaths.add(sub.url);
              }
            }
          }
        }
      }

      // 2. If it's a category page listing products, payload.collection will be present.
      if (!payload.collection || !payload.collection.products) {
        break; // No products here, and no pagination
      }

      totalPages = payload.collection.pages || 1;

      const products: ProductOfferingInput[] = [];
      for (const item of Object.values(payload.collection.products) as any[]) {
        const externalId = String(item.id);
        if (seenProductIds.has(externalId)) continue;
        seenProductIds.add(externalId);

        const productUrl = `${baseUrl}/${item.url.replace(/^\//, "")}`;

        products.push({
          sourceId: config.id,
          sourceKind: "retoertje",
          externalId,
          title: item.title,
          url: productUrl,
          imageUrls: item.image ? [`https://cdn.webshopapp.com/shops/351609/files/${item.image}/image.jpg`] : [], 
          currency: "EUR",
          price: item.price?.price,
          compareAtPrice: item.price?.price_old,
          availability: item.available ? "available" : "unavailable",
          seller: item.brand && typeof item.brand === "object" ? item.brand.title : undefined,
          categories: [],
          attributes: {},
          raw: item as unknown as JsonObject
        });
      }

      if (products.length > 0) {
        yield products;
      }

      page++;
    }
  }
}

export function createRetoertjeAdapter(): ReadOnlySourceAdapter<RetoertjeConfig> {
  return {
    kind: "retoertje",
    async *fetchProducts(config, context) {
      const baseUrl = config.url.replace(/\/$/, "");

      // Step 1: Fetch homepage JSON to discover top-level categories
      const homeResponse = await context.http.fetch(`${baseUrl}/?format=json`, {
        headers: {
          "accept": "application/json",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        }
      });
      if (!homeResponse.ok) {
        throw new Error("retoertje source home fetch failed: " + homeResponse.status);
      }
      const homePayload = await homeResponse.json() as any;

      // We will queue category paths to crawl.
      const categoryPathsQueue: string[] = [];
      const seenPaths = new Set<string>();

      if (homePayload.categories) {
        for (const cat of Object.values(homePayload.categories) as any[]) {
          if (cat.url && !seenPaths.has(cat.url)) {
            categoryPathsQueue.push(cat.url);
            seenPaths.add(cat.url);
          }
        }
      }

      // Fallbacks in case homepage fetch is empty
      const fallbackPaths = ["retourdeals", "nieuw-online"];
      for (const fb of fallbackPaths) {
        if (!seenPaths.has(fb)) {
          categoryPathsQueue.push(fb);
          seenPaths.add(fb);
        }
      }

      yield* crawlRetoertje(config, context, categoryPathsQueue, seenPaths);
    },

    async *searchProducts(config, input, context) {
      const cleanQuery = input.query.replace(/^\//, "").replace(/\/$/, "");
      const searchPath = `search/${cleanQuery}`;
      yield* crawlRetoertje(config, context, [searchPath]);
    }
  };
}