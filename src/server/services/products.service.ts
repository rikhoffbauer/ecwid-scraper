import { OperationsDatabase } from "../operations/database.ts";
import { buildCatalogProducts, catalogContext, hasMeaningfulAttributes, productName, productPrice, searchableText, type CatalogProduct } from "../../shared/catalog.ts";
import { compileProductQuery, compileProductQueryToSQL } from "../query-language.ts";
import type { LoadedProduct } from "../../shared/types.ts";
import { clusterProducts, priceIndex, dealCandidates, buildAnalysisSnapshot } from "../analysis.ts";

export interface SearchProductsParams {
  query?: string;
  storeFilter?: string[];
  favorites?: string[]; // array of keys
  activeListKeys?: string[]; // array of keys if a specific list is selected
  showHidden?: boolean;
  sortKey?: string;
  offset?: number;
  limit?: number;
}

export class ProductsService {
  constructor(private readonly db: OperationsDatabase) {}

  private getLoadedProducts(): LoadedProduct[] {
    const data = this.db.listProductOfferings();
    return data.map(d => ({
      storeId: d.storeId || "unknown",
      path: `products/${d.productId}`,
      hash: d.hash,
      summary: (d.product as any).summary || d.product,
      product: d.product,
      canonicalProductId: d.canonicalProductId,
      canonicalMatchConfidence: d.canonicalMatchConfidence,
      canonicalMatchReviewState: d.canonicalMatchReviewState
    }));
  }

  searchProducts(params: SearchProductsParams, config: { stores: any[] }) {
    let sqlCondition: { sql: string; params: unknown[] } | undefined;
    if (params.query?.trim()) {
      sqlCondition = compileProductQueryToSQL(params.query);
      if (sqlCondition.error) {
        // If compilation fails, we can either return empty or ignore.
        // Returning empty since it's an invalid query.
        return { total: 0, products: [] };
      }
    }

    const result = this.db.searchProductOfferings({
      storeFilter: params.storeFilter,
      favorites: params.favorites,
      activeListKeys: params.activeListKeys,
      showHidden: params.showHidden,
      sortKey: params.sortKey,
      offset: params.offset,
      limit: params.limit
    }, sqlCondition);

    // Map database rows to the CatalogProduct schema expected by the frontend
    const catalogProducts = buildCatalogProducts(
      result.products.map(d => ({
        storeId: d.storeId || "unknown",
        path: `products/${d.productId}`,
        hash: d.hash,
        summary: (d.product as any).summary || d.product,
        product: d.product,
        canonicalProductId: d.canonicalProductId,
        canonicalMatchConfidence: d.canonicalMatchConfidence,
        canonicalMatchReviewState: d.canonicalMatchReviewState
      })),
      config as any
    );

    return { total: result.total, products: catalogProducts };
  }

  getAnalysisSnapshot(dealThreshold = 0.9) {
    const products = this.getLoadedProducts();
    const clusters = clusterProducts(products, 0.85);
    return buildAnalysisSnapshot(products, clusters, dealThreshold);
  }

  listProductOfferings() {
    return this.db.listProductOfferings();
  }

  listCanonicalProducts() {
    return this.db.listCanonicalProducts();
  }

  productOfferingDetails(id: number) {
    return this.db.productOfferingDetails(id);
  }

  canonicalProductDetails(id: number) {
    return this.db.canonicalProductDetails(id);
  }
}
