import { serve } from "bun";
import index from "../client/index.html";
import { OperationsDatabase } from "./operations/database.ts";
import { createDefaultActionRegistry } from "./operations/actions.ts";
import { createSearchScheduler } from "./searches.ts";
import { SourceOnboardingManager } from "./source-onboarding.ts";
import { logger } from "./lib/logger.ts";

// Services
import { ProductsService } from "./services/products.service.ts";
import { AssistantService } from "./services/assistant.service.ts";
import { StoresService } from "./services/stores.service.ts";
import { SearchesService } from "./services/searches.service.ts";

// Controllers
import { createProductsRoutes } from "./controllers/products.controller.ts";
import { createStoresRoutes } from "./controllers/stores.controller.ts";
import { createSearchesRoutes } from "./controllers/searches.controller.ts";
import { createAssistantRoutes } from "./controllers/assistant.controller.ts";
import { createEnrichmentRoutes } from "./controllers/enrichment.controller.ts";
import { createOnboardingRoutes } from "./controllers/onboarding.controller.ts";
import { createMiscRoutes } from "./controllers/misc.controller.ts";

export interface ServerOptions {
  port?: number;
  database?: OperationsDatabase;
  onboarding?: any;
  onboardingToken?: string;
  token?: string;
  assistant?: any;
}

export function createServer(options: ServerOptions = {}) {
  const db = options.database || new OperationsDatabase();
  const actions = createDefaultActionRegistry();
  
  const onboarding =
    options.onboarding !== undefined
      ? options.onboarding
      : process.env.ENABLE_AI_ADAPTER_ONBOARDING === "1"
        ? new SourceOnboardingManager(db)
        : null;
  const onboardingToken =
    options.onboardingToken !== undefined
      ? options.onboardingToken
      : process.env.AI_ADAPTER_ONBOARDING_TOKEN;
  
  const port = options.port ?? parseInt(process.env.PORT || "3000", 10);

  // Initialize Services
  const storesService = new StoresService(db);
  const productsService = new ProductsService(db);
  const searchesService = new SearchesService(db);
  const assistantService = new AssistantService(db, options.assistant);

  function json(value: unknown, status = 200): Response {
    return Response.json(value, {
      status,
      headers: { "cache-control": "no-store" },
    });
  }

  // Create routes objects
  const apiRoutes = {
    ...createProductsRoutes(productsService, () => storesService.getConfig()),
    ...createStoresRoutes(storesService),
    ...createSearchesRoutes(searchesService),
    ...createAssistantRoutes(assistantService),
    ...createEnrichmentRoutes(db),
    ...createOnboardingRoutes(onboarding, onboardingToken),
    ...createMiscRoutes(db, actions),
  };

  const server = serve({
    port,
    idleTimeout: -1,
    routes: {
      "/*": index,
      // Mount all API routes directly into Bun serve
      ...apiRoutes
    },
    development: process.env.NODE_ENV !== "production" && {
      hmr: true,
      console: true,
    },
  });

  createSearchScheduler(db);
  console.log(`🚀 Server running at ${server.url}`);
  return server;
}

if (import.meta.main) {
  createServer();
}
