import type { OperationsDatabase } from "../operations/database.ts";
import type { ActionRegistry } from "../operations/actions.ts";

function json(value: unknown, status = 200): Response {
  return Response.json(value, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export function createMiscRoutes(db: OperationsDatabase, actions: ActionRegistry) {
  return {
    "/api/events": {
      GET(req: Request) {
        return json(db.listEvents());
      }
    },
    "/api/health": {
      GET(req: Request) {
        return json({ ok: true });
      }
    },
    "/api/actions": {
      GET(req: Request) {
        return json(actions.list());
      }
    },
    "/api/actions/:name": {
      async POST(req: Request & { params: { name: string } }) {
        const name = decodeURIComponent(req.params.name);
        try {
          // Note: Here we pass a getter for products since they might be needed by the action.
          const products = db.listProducts().map((item: any) => ({
            ...item.product,
            storeId: item.storeId,
            productId: item.productId,
          }));
          return json(
            await actions.execute(
              name,
              (await req.json()) as Record<string, unknown>,
              { db, actor: "api", products },
            ),
          );
        } catch (error) {
          return json({ error: (error as Error).message }, 400);
        }
      }
    },
    "/api/flags": {
      GET(req: Request) {
        const url = new URL(req.url);
        return json(
          db.listFlags(
            url.searchParams.get("sourceId") ?? undefined,
            url.searchParams.get("productId") ?? undefined,
          ),
        );
      }
    },
    "/api/rules": {
      GET(req: Request) {
        return json(db.listRules());
      },
      async POST(req: Request) {
        const input = (await req.json()) as {
          name: string;
          instruction: string;
          eventTypes?: string[];
          sourceIds?: string[];
          enabled?: boolean;
        };
        return json(
          db.createRule({
            ...input,
            eventTypes: input.eventTypes ?? [],
            sourceIds: input.sourceIds ?? [],
          }),
          201,
        );
      }
    },
    "/api/audit": {
      GET(req: Request) {
        return json(db.listAudit());
      }
    }
  };
}
