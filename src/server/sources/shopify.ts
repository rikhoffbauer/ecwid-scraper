import type { JsonObject, JsonValue } from "../../shared/types.ts";
import type { ProductOfferingInput, ReadOnlySourceAdapter, SourceConfig } from "./types.ts";

interface ShopifyConfig extends SourceConfig {
  kind: "shopify";
}

interface ShopifyPage {
  data?: {
    products?: {
      nodes?: ShopifyProduct[];
      pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
    };
  };
  errors?: Array<{ message?: string }>;
}

interface ShopifyProduct {
  id?: string;
  title?: string;
  description?: string;
  handle?: string;
  onlineStoreUrl?: string | null;
  productType?: string;
  vendor?: string;
  tags?: string[];
  availableForSale?: boolean;
  featuredImage?: { url?: string } | null;
  images?: { nodes?: Array<{ url?: string }> };
  priceRange?: { minVariantPrice?: { amount?: string; currencyCode?: string } };
  compareAtPriceRange?: { minVariantPrice?: { amount?: string; currencyCode?: string } };
}

const PRODUCTS_QUERY = `
  query TrackedProducts($first: Int!, $after: String, $query: String, $sortKey: ProductSortKeys!) {
    products(first: $first, after: $after, query: $query, sortKey: $sortKey) {
      nodes {
        id title description handle onlineStoreUrl productType vendor tags availableForSale
        featuredImage { url }
        images(first: 20) { nodes { url } }
        priceRange { minVariantPrice { amount currencyCode } }
        compareAtPriceRange { minVariantPrice { amount currencyCode } }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

function settingString(config: ShopifyConfig, key: string): string | undefined {
  const value = config.settings?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function endpoint(config: ShopifyConfig): string {
  const domain = new URL(config.url).hostname;
  const version = settingString(config, "apiVersion") ?? "2026-01";
  return `https://${domain}/api/${version}/graphql.json`;
}

function amount(value: unknown): number | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function externalId(value: string | undefined): string {
  return value?.split("/").at(-1) ?? "";
}

function normalize(config: ShopifyConfig, product: ShopifyProduct): ProductOfferingInput {
  const id = externalId(product.id);
  const imageUrls = [
    product.featuredImage?.url,
    ...(product.images?.nodes ?? []).map((image) => image.url)
  ].filter((url): url is string => typeof url === "string" && url.length > 0);
  const categories = [product.productType, ...(product.tags ?? [])].filter((value): value is string => typeof value === "string" && value.length > 0);
  return {
    sourceId: config.id,
    sourceKind: "shopify",
    externalId: id,
    title: product.title?.trim() || `Product ${id}`,
    description: product.description?.trim() || undefined,
    url: product.onlineStoreUrl ?? `${config.url.replace(/\/$/, "")}/products/${product.handle ?? id}`,
    imageUrls: [...new Set(imageUrls)],
    currency: product.priceRange?.minVariantPrice?.currencyCode,
    price: amount(product.priceRange?.minVariantPrice?.amount),
    compareAtPrice: amount(product.compareAtPriceRange?.minVariantPrice?.amount),
    availability: product.availableForSale === true ? "available" : product.availableForSale === false ? "unavailable" : "unknown",
    seller: product.vendor,
    categories: [...new Set(categories)],
    attributes: {},
    raw: product as unknown as JsonObject
  };
}

export const shopifySourceAdapter: ReadOnlySourceAdapter<ShopifyConfig> = {
  kind: "shopify",
  async *fetchProducts(config, context) {
    yield* fetchShopifyProducts(config, undefined, context);
  },
  async *searchProducts(config, input, context) {
    yield* fetchShopifyProducts(config, input.query, context);
  }
};

async function* fetchShopifyProducts(
  config: ShopifyConfig,
  query: string | undefined,
  context: Parameters<NonNullable<ReadOnlySourceAdapter<ShopifyConfig>["searchProducts"]>>[2]
): AsyncGenerator<ProductOfferingInput[], void, unknown> {
    const tokenEnv = config.credentialsEnv?.storefrontToken;
    const token = tokenEnv ? process.env[tokenEnv] : undefined;
    let after: string | null = null;
    do {
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (token) headers["x-shopify-storefront-access-token"] = token;
      const queryUrl = new URL(endpoint(config));
      queryUrl.searchParams.set("query", PRODUCTS_QUERY);
      queryUrl.searchParams.set("variables", JSON.stringify({ first: 100, after, query, sortKey: query ? "RELEVANCE" : "TITLE" }));
      const response = await context.http.fetch(queryUrl, { headers });
      if (!response.ok) throw new Error(`Shopify source ${config.id} failed: ${response.status} ${response.statusText}`);
      const page = await response.json() as ShopifyPage;
      if (page.errors?.length) throw new Error(`Shopify source ${config.id} failed: ${page.errors.map((error) => error.message ?? "unknown error").join("; ")}`);
      const connection = page.data?.products;
      if (!connection) throw new Error(`Shopify source ${config.id} returned no products connection`);
      
      const chunk = (connection.nodes ?? []).map((product) => normalize(config, product));
      if (chunk.length > 0) yield chunk;

      after = connection.pageInfo?.hasNextPage ? connection.pageInfo.endCursor ?? null : null;
      if (connection.pageInfo?.hasNextPage && !after) throw new Error(`Shopify source ${config.id} indicated another page without an end cursor`);
    } while (after);
}

export type { ShopifyConfig };
