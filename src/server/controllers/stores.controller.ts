import type { StoresService } from "../services/stores.service.ts";

function json(value: unknown, status = 200): Response {
  return Response.json(value, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export function createStoresRoutes(storesService: StoresService) {
  return {
    "/api/stores": {
      GET(req: Request) {
        return json(storesService.listStores());
      },
      async POST(req: Request) {
        const input = await req.json() as any;
        storesService.addStore(input);
        return json({ ok: true });
      }
    },
    "/api/stores/:id": {
      async PUT(req: Request & { params: { id: string } }) {
        const input = await req.json() as any;
        storesService.updateStore(req.params.id, input);
        return json({ ok: true });
      },
      DELETE(req: Request & { params: { id: string } }) {
        if (req.params.id) storesService.deleteStore(req.params.id);
        return json({ ok: true });
      }
    },
    "/api/sync": {
      async POST(req: Request) {
        const url = new URL(req.url);
        const storeIdParam = url.searchParams.get("storeId");

        const stream = new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder();
            const emit = (event: string, data: unknown) =>
              controller.enqueue(
                encoder.encode(
                  `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
                ),
              );
            try {
              for await (const message of storesService.syncStores(storeIdParam)) {
                emit("progress", message);
              }
              emit("done", { ok: true });
            } catch (error) {
              emit("error", { error: (error as Error).message });
            } finally {
              controller.close();
            }
          },
        });
        return new Response(stream, {
          headers: {
            "content-type": "text/event-stream",
            "cache-control": "no-store",
            connection: "keep-alive",
          },
        });
      }
    },
    "/api/config": {
      GET(req: Request) {
        return json(storesService.getConfig());
      }
    }
  };
}
