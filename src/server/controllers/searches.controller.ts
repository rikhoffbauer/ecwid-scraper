import type { SearchesService } from "../services/searches.service.ts";

function json(value: unknown, status = 200): Response {
  return Response.json(value, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export function createSearchesRoutes(searchesService: SearchesService) {
  return {
    "/api/search/direct": {
      async POST(req: Request) {
        const input = await req.json() as { query?: string; sourceIds?: string[] };
        try {
          return json(await searchesService.searchDirect(input.query ?? "", input.sourceIds ?? []));
        } catch (error) {
          return json({ error: (error as Error).message }, 400);
        }
      }
    },
    "/api/searches": {
      GET(req: Request) {
        return json(searchesService.listSavedSearches());
      },
      async POST(req: Request) {
        const input = await req.json() as any;
        try {
          return json(searchesService.createSavedSearch(input), 201);
        } catch (error) {
          return json({ error: (error as Error).message }, 400);
        }
      }
    },
    "/api/searches/due/run": {
      async POST(req: Request) {
        return json(await searchesService.runDueSavedSearches());
      }
    },
    "/api/searches/:id": {
      GET(req: Request & { params: { id: string } }) {
        const search = searchesService.getSavedSearch(Number(req.params.id));
        return search ? json(search) : json({ error: "not found" }, 404);
      },
      async PUT(req: Request & { params: { id: string } }) {
        const input = await req.json() as any;
        try {
          const search = searchesService.updateSavedSearch(Number(req.params.id), input);
          return search ? json(search) : json({ error: "not found" }, 404);
        } catch (error) {
          return json({ error: (error as Error).message }, 400);
        }
      },
      DELETE(req: Request & { params: { id: string } }) {
        return json({ removed: searchesService.deleteSavedSearch(Number(req.params.id)) });
      }
    },
    "/api/searches/:id/:action": {
      async POST(req: Request & { params: { id: string; action: string } }) {
        const id = Number(req.params.id);
        if (req.params.action === "run") {
          try {
            return json(await searchesService.runSavedSearch(id));
          } catch (error: any) {
             if (error.message === "not found") return json({ error: "not found" }, 404);
             return json({ error: error.message }, 400);
          }
        }
        return json({ error: "not found" }, 404);
      },
      GET(req: Request & { params: { id: string; action: string } }) {
        const id = Number(req.params.id);
        const search = searchesService.getSavedSearch(id);
        if (!search) return json({ error: "not found" }, 404);
        if (req.params.action === "results") return json(searchesService.listSavedSearchResults(id));
        if (req.params.action === "runs") return json(searchesService.listSavedSearchRuns(id));
        if (req.params.action === "events") return json(searchesService.listSavedSearchEvents(id));
        return json({ error: "not found" }, 404);
      }
    }
  };
}
