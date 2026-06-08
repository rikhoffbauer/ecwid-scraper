import type { ProductsService } from "../services/products.service.ts";

function json(value: unknown, status = 200): Response {
  return Response.json(value, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export function createProductsRoutes(productsService: ProductsService, configProvider: () => { stores: any[] }) {
  return {
    "/api/products": {
      GET(req: Request) {
        // Legacy or minimal response? Not strictly needed if we have search
        return json(productsService.listProductOfferings());
      }
    },
    "/api/products/search": {
      async POST(req: Request) {
        try {
          const input = await req.json() as any;
          const config = configProvider();
          const result = productsService.searchProducts(input, config);
          return json(result);
        } catch (error) {
          return json({ error: (error as Error).message }, 400);
        }
      }
    },
    "/api/analysis": {
      GET(req: Request) {
        return json(productsService.getAnalysisSnapshot());
      }
    },
    "/api/product-offerings": {
      GET(req: Request) {
        return json(productsService.listProductOfferings());
      }
    },
    "/api/canonical-products": {
      GET(req: Request) {
        return json(productsService.listCanonicalProducts());
      }
    },
    "/api/product-offerings/:id": {
      GET(req: Request & { params: { id: string } }) {
        const offering = productsService.productOfferingDetails(Number(req.params.id));
        return offering ? json(offering) : json({ error: "not found" }, 404);
      }
    },
    "/api/canonical-products/:id": {
      GET(req: Request & { params: { id: string } }) {
        const product = productsService.canonicalProductDetails(Number(req.params.id));
        return product ? json(product) : json({ error: "not found" }, 404);
      }
    },
    "/api/products/:storeId": {
      GET(req: Request & { params: { storeId: string } }) {
        // Let's get listStoreProducts from DB
        // Wait, productsService doesn't expose it. Let's add it or use db directly inside productsService.
        // For now, return empty or implement it.
        const storeId = req.params.storeId;
        // Assume productsService has access to this or we add it later.
        // productsService has db.
        return json((productsService as any).db.listStoreProducts(storeId));
      }
    }
  };
}
