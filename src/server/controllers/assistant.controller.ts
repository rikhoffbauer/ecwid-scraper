import type { AssistantService } from "../services/assistant.service.ts";
import path from "node:path";
import { mkdir } from "node:fs/promises";

function json(value: unknown, status = 200): Response {
  return Response.json(value, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export function createAssistantRoutes(assistantService: AssistantService) {
  return {
    "/api/assistant-runs/:id": {
      GET(req: Request & { params: { id: string } }) {
        const run = assistantService.getRun(Number(req.params.id));
        return run ? json(run) : json({ error: "not found" }, 404);
      }
    },
    "/api/assistant-runs/:id/cancel": {
      POST(req: Request & { params: { id: string } }) {
        return json({
          cancelled: assistantService.cancelRun(Number(req.params.id)),
        });
      }
    },
    "/api/conversations": {
      GET(req: Request) {
        const url = new URL(req.url);
        return json(assistantService.listConversations(url.searchParams.get("archived") === "true"));
      },
      async POST(req: Request) {
        const input = (await req.json().catch(() => ({}))) as { title?: string };
        return json(assistantService.createConversation(input.title), 201);
      }
    },
    "/api/conversations/:id": {
      async PATCH(req: Request & { params: { id: string } }) {
        const id = Number(req.params.id);
        const input = (await req.json()) as { title?: string; archived?: boolean };
        const conversation = assistantService.updateConversation(id, input);
        return conversation ? json(conversation) : json({ error: "not found" }, 404);
      },
      async DELETE(req: Request & { params: { id: string } }) {
        const id = Number(req.params.id);
        const removed = await assistantService.deleteConversation(id, async (id) => {
          const { rm } = await import("node:fs/promises");
          await rm(path.resolve(".ecwid-sync/attachments", String(id)), {
            recursive: true,
            force: true,
          });
        });
        return json({ removed });
      }
    },
    "/api/conversations/:id/messages": {
      GET(req: Request & { params: { id: string } }) {
        return json(assistantService.listMessages(Number(req.params.id)));
      },
      async POST(req: Request & { params: { id: string } }) {
        try {
          const conversationId = Number(req.params.id);
          const contentType = req.headers.get("content-type") ?? "";
          let message = "",
            screenFrame: string | undefined,
            model = "",
            providerId: number | null = null;
          const attachmentPaths: string[] = [];
          if (contentType.includes("multipart/form-data")) {
            const form = await req.formData();
            message = String(form.get("message") ?? "");
            screenFrame = form.get("screenFrame")
              ? String(form.get("screenFrame"))
              : undefined;
            model = String(form.get("model") ?? "");
            providerId = form.get("providerId")
              ? Number(form.get("providerId"))
              : null;
            const directory = path.resolve(
              ".ecwid-sync/attachments",
              String(conversationId),
            );
            await mkdir(directory, { recursive: true });
            for (const file of form.getAll("files")) {
              if (!(file instanceof File)) continue;
              const target = path.join(
                directory,
                `${crypto.randomUUID()}-${path.basename(file.name)}`,
              );
              await Bun.write(target, file);
              attachmentPaths.push(target);
            }
          } else {
            const input = (await req.json()) as any;
            message = input.message ?? "";
            screenFrame = input.screenFrame;
            model = input.model ?? "";
            providerId = input.providerId ?? null;
          }
          if (!message.trim() && !attachmentPaths.length)
            return json({ error: "message or attachment is required" }, 400);

          return json(
            assistantService.startRun({
              conversationId,
              message,
              screenFrame,
              model,
              providerId,
              attachmentPaths,
            }),
            202,
          );
        } catch (error) {
          return json({ error: (error as Error).message }, 409);
        }
      }
    },
    "/api/conversations/:id/runs": {
      GET(req: Request & { params: { id: string } }) {
        return json(assistantService.listRuns(Number(req.params.id)));
      }
    },
    "/api/conversations/:id/events": {
      GET(req: Request & { params: { id: string } }) {
        const url = new URL(req.url);
        const conversationId = Number(req.params.id);
        let afterId = Number(
          req.headers.get("last-event-id") ??
            url.searchParams.get("after") ??
            0,
        );
        const once = url.searchParams.get("once") === "true";
        const stream = new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();
            let timer: ReturnType<typeof setInterval>;
            const send = () => {
              for (const item of assistantService.listEvents(conversationId, afterId)) {
                afterId = item.id;
                controller.enqueue(
                  encoder.encode(
                    `id: ${item.id}\nevent: ${item.event}\ndata: ${JSON.stringify(item.data)}\n\n`,
                  ),
                );
              }
              if (once) {
                controller.close();
                clearInterval(timer);
              }
            };
            timer = setInterval(send, 250);
            send();
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
    "/api/llm-providers": {
      GET(req: Request) {
        return json(assistantService.listProviders());
      },
      async POST(req: Request) {
        const input = (await req.json()) as any;
        return json(assistantService.addProvider(input), 201);
      }
    },
    "/api/llm-providers/:id": {
      async PUT(req: Request & { params: { id: string } }) {
        const input = (await req.json()) as any;
        return json(assistantService.updateProvider(Number(req.params.id), input));
      },
      DELETE(req: Request & { params: { id: string } }) {
        return json({ ok: assistantService.deleteProvider(Number(req.params.id)) });
      }
    },
    "/api/llm-providers/test": {
      async POST(req: Request) {
        try {
          const input = (await req.json()) as any;
          const message = await assistantService.testProvider(input);
          return json({ ok: true, message });
        } catch (error) {
          return json({ ok: false, error: (error as Error).message }, 400);
        }
      }
    },
    "/api/llm-providers/models": {
      async POST(req: Request) {
        try {
          const input = (await req.json()) as any;
          const models = await assistantService.listModels(input);
          return json({ ok: true, models });
        } catch (error) {
          return json({ ok: false, error: (error as Error).message }, 400);
        }
      }
    },
    "/api/llm-models": {
      async GET(req: Request) {
        const providers = assistantService.listProviders();
        if (!providers.length) {
          return json([
            {
              providerId: null,
              providerName: "Default",
              models: [process.env.OPENAI_MODEL ?? "gpt-4.1"],
              error: null,
            },
          ]);
        }
        const results = await Promise.all(
          providers.map(async (provider) => {
            try {
              const models = await assistantService.listModels({
                provider: provider.provider,
                configJson: provider.configJson,
              });
              return {
                providerId: provider.id,
                providerName: provider.name,
                models,
                error: null,
              };
            } catch (error) {
              return {
                providerId: provider.id,
                providerName: provider.name,
                models: [provider.model],
                error: (error as Error).message,
              };
            }
          }),
        );
        return json(results);
      }
    },
    "/api/assistant-settings": {
      GET(req: Request) {
        return json(assistantService.getSettings());
      },
      async PATCH(req: Request) {
        const input = (await req.json()) as any;
        return json(assistantService.updateSettings(input.titleModel));
      }
    },
    "/api/realtime/client-secret": {
      async POST(req: Request) {
        try {
          const text = await assistantService.createRealtimeSecret();
          return new Response(text, {
            status: 200,
            headers: {
              "content-type": "application/json",
              "cache-control": "no-store",
            },
          });
        } catch (error: any) {
          if (error.message.includes("OPENAI_API_KEY")) {
            return json({ error: error.message }, 503);
          }
          return json({ error: error.message }, 400);
        }
      }
    }
  };
}
