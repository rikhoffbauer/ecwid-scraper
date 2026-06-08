import type { JsonObject } from "../../shared/types.ts";
import type { ProductOfferingInput, ReadOnlySourceAdapter, SourceConfig, SourceContext } from "./types.ts";

export interface IboodConfig extends SourceConfig {
  kind: "ibood";
  settings?: {
    tenantId?: string;
    shopId?: string;
  };
}

interface IboodPrice {
  currency: string;
  value: number;
}

interface IboodImage {
  id?: string;
  extension?: string;
}

interface IboodItem {
  id: string;
  title?: string;
  brand?: string;
  price?: IboodPrice;
  referencePrice?: IboodPrice;
  soldOut?: boolean;
  slug?: string;
  classicId?: string;
  categories?: string[];
  image?: IboodImage;
  [key: string]: unknown;
}

interface IboodResponse {
  data?: {
    items?: IboodItem[];
  };
}

function resolveImageUrl(tenantId: string, image?: IboodImage): string[] {
  if (!image || !image.id || !image.extension) return [];
  const ext = image.extension.replace("image/", "");
  let rawUrl = "";
  if (["png", "jpg", "jpeg"].includes(ext)) {
    rawUrl = `gs://ibex-prd-api-30f0-documents-public/${tenantId}/${image.id}/image.${ext}`;
  } else if (["gif"].includes(ext)) {
    rawUrl = `gs://ibood-go-production-gcs-storage/images/source/${image.id}.${ext}`;
  }
  if (!rawUrl) return [];
  const encoded = Buffer.from(rawUrl).toString('base64').replace(/=+$/, "");
  return [`https://image.ibood.io/image/w256/${encoded}`];
}

async function* fetchIbood(config: IboodConfig, context: SourceContext, query?: string) {
  const tenantId = config.settings?.tenantId || "eafb3ef2-e1ba-4f01-b67a-b0447bea74eb";
  const shopId = config.settings?.shopId || "b22a484d-fd20-570a-adf6-22edf2fdaf79";
  const limit = 1000;
  let skip = 0;
  const seen = new Set<string>();
  
  while (true) {
    let url = `https://api.ibood.io/search/items/live?take=${limit}&skip=${skip}`;
    if (query) {
      url += `&q=${encodeURIComponent(query)}`;
    }
    
    const response = await context.http.fetch(url, {
      headers: {
        "ibex-language": "nl",
        "ibex-shop-id": shopId,
        "ibex-tenant-id": tenantId,
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
        "accept": "application/json"
      }
    });
    
    if (!response.ok) {
      throw new Error(`ibood source ${config.id} failed: ${response.status} ${response.statusText}`);
    }
    
    const payload = await response.json() as IboodResponse;
    const items = payload.data?.items || [];
    if (items.length === 0) break;
    
    const products: ProductOfferingInput[] = [];
    for (const item of items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);

      const productUrl = item.slug && item.classicId 
        ? `https://www.ibood.com/nl/s-nl/o/${item.slug}/${item.classicId}`
        : `https://www.ibood.com/nl/s-nl/`;

      products.push({
        sourceId: config.id,
        sourceKind: "ibood",
        externalId: item.id,
        title: item.title || item.id,
        url: productUrl,
        imageUrls: resolveImageUrl(tenantId, item.image),
        currency: item.price?.currency || "EUR",
        price: item.price?.value,
        compareAtPrice: item.referencePrice?.value,
        availability: item.soldOut ? "unavailable" : "available",
        seller: item.brand,
        categories: item.categories || [],
        attributes: {},
        raw: item as unknown as JsonObject
      });
    }
    
    if (products.length > 0) {
      yield products;
    }
    
    if (items.length < limit) break;
    skip += limit;
  }
}

export const iboodSourceAdapter: ReadOnlySourceAdapter<IboodConfig> = {
  kind: "ibood",
  async *fetchProducts(config, context) {
    yield* fetchIbood(config, context);
  },
  async *searchProducts(config, input, context) {
    yield* fetchIbood(config, context, input.query);
  }
};
