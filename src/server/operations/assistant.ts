import { readdir, readFile, writeFile } from "node:fs/promises";
import OpenAI from "openai";
import { chat, toolDefinition, EventType } from "@tanstack/ai";
import { createCodeMode } from "@tanstack/ai-code-mode";
import { createQuickJSIsolateDriver } from "@tanstack/ai-isolate-quickjs";
import { openaiText } from "@tanstack/ai-openai";
import { z } from "zod";
import type { JsonObject } from "../../shared/types.ts";
import { createOpenAIClient, type ProviderClientOptionsInput, clientOptionsForProvider } from "../lib/openai-compatible.ts";
import { ActionRegistry, type ActionContext } from "./actions.ts";
import { OperationsDatabase } from "./database.ts";
import { widgetsForToolCall, type AssistantWidget } from "./widgets.ts";
import { logger } from "../lib/logger.ts";

export interface AssistantReply {
  conversationId: number;
  text: string;
  responseId: string;
  toolCalls: Array<{ name: string; input: unknown; output: unknown }>;
  widgets: AssistantWidget[];
}

export interface AssistantReplyOptions {
  providerId?: number | null;
  model?: string;
  attachmentPaths?: string[];
  signal?: AbortSignal;
  onEvent?: (event: string, data: unknown) => void;
}

function getTanstackTools(
  actions: ActionRegistry, 
  db: OperationsDatabase, 
  conversationId: number, 
  widgets: AssistantWidget[], 
  toolCalls: Array<{ name: string; input: unknown; output: unknown }>
) {
  const context: ActionContext = {
    db,
    actor: `assistant:${conversationId}`,
    products: db.listProducts().map((item: any) => ({
      ...item.product,
      storeId: item.storeId,
      productId: item.productId,
    }))
  };

  const actionTools = [
    toolDefinition({
      name: "products_search",
      description: "Search tracked products by text.",
      inputSchema: z.object({ query: z.string() })
    }).server(async (input) => {
      const output = await actions.execute("products.search", input, context);
      toolCalls.push({ name: "products.search", input, output });
      widgets.push(...widgetsForToolCall("products.search", input, output));
      return output;
    }),
    toolDefinition({
      name: "products_compare",
      description: "Find likely matching tracked products by product name, SKU, or identifier.",
      inputSchema: z.object({ query: z.string() })
    }).server(async (input) => {
      const output = await actions.execute("products.compare", input, context);
      toolCalls.push({ name: "products.compare", input, output });
      widgets.push(...widgetsForToolCall("products.compare", input, output));
      return output;
    }),
    toolDefinition({
      name: "events_recent",
      description: "Read recent tracked product events.",
      inputSchema: z.object({ sourceId: z.string().optional(), limit: z.number().optional() })
    }).server(async (input) => {
      const output = await actions.execute("events.recent", input, context);
      toolCalls.push({ name: "events.recent", input, output });
      widgets.push(...widgetsForToolCall("events.recent", input, output));
      return output;
    }),
    toolDefinition({
      name: "flags_add",
      description: "Add or update an internal flag on a tracked product.",
      inputSchema: z.object({ sourceId: z.string(), productId: z.string(), label: z.string(), rationale: z.string().optional(), confidence: z.number().optional() })
    }).server(async (input) => {
      const output = await actions.execute("flags.add", input, context);
      toolCalls.push({ name: "flags.add", input, output });
      widgets.push(...widgetsForToolCall("flags.add", input, output));
      return output;
    }),
    toolDefinition({
      name: "flags_remove",
      description: "Undo an internal product flag. This never changes a source store.",
      inputSchema: z.object({ sourceId: z.string(), productId: z.string(), label: z.string() })
    }).server(async (input) => {
      const output = await actions.execute("flags.remove", input, context);
      toolCalls.push({ name: "flags.remove", input, output });
      widgets.push(...widgetsForToolCall("flags.remove", input, output));
      return output;
    })
  ];

  const hostTools = [
    toolDefinition({
      name: "host_shell",
      description: "Run an unrestricted shell command on the application host.",
      inputSchema: z.object({ command: z.string(), cwd: z.string().optional() }),
    }).server(async ({ command, cwd }) => {
      const proc = Bun.spawn(["zsh", "-lc", command], { cwd: cwd ? cwd : process.cwd(), stdout: "pipe", stderr: "pipe" });
      const output = { exitCode: await proc.exited, stdout: await new Response(proc.stdout).text(), stderr: await new Response(proc.stderr).text() };
      db.recordAudit({ action: "host_shell", actor: `assistant:${conversationId}`, input: { command, cwd }, output, status: "succeeded" });
      return output;
    }),
    toolDefinition({
      name: "host_read_file",
      description: "Read any file from the application host.",
      inputSchema: z.object({ path: z.string() }),
    }).server(async ({ path }) => {
      const output = { content: await readFile(path, "utf8") };
      db.recordAudit({ action: "host_read_file", actor: `assistant:${conversationId}`, input: { path }, output, status: "succeeded" });
      return output;
    }),
    toolDefinition({
      name: "host_write_file",
      description: "Write any file on the application host.",
      inputSchema: z.object({ path: z.string(), content: z.string() }),
    }).server(async ({ path, content }) => {
      await writeFile(path, content);
      const output = { ok: true };
      db.recordAudit({ action: "host_write_file", actor: `assistant:${conversationId}`, input: { path, content }, output, status: "succeeded" });
      return output;
    }),
    toolDefinition({
      name: "host_list_directory",
      description: "List any directory on the application host.",
      inputSchema: z.object({ path: z.string() }),
    }).server(async ({ path }) => {
      const output = { entries: await readdir(path) };
      db.recordAudit({ action: "host_list_directory", actor: `assistant:${conversationId}`, input: { path }, output, status: "succeeded" });
      return output;
    })
  ];

  return [...actionTools, ...hostTools];
}

export class InteractiveAssistant {
  constructor(
    private readonly db: OperationsDatabase,
    private readonly actions: ActionRegistry,
    private readonly fallbackApiKey = process.env.OPENAI_API_KEY,
    private readonly fallbackModel = process.env.OPENAI_MODEL ?? "gpt-4.1",
    private readonly fallbackBaseURL = process.env.OPENAI_BASE_URL
  ) {}

  async reply(conversationId: number, message: string, screenFrame?: string, options: AssistantReplyOptions = {}): Promise<AssistantReply> {
    if (!this.db.conversation(conversationId)) throw new Error(`Conversation ${conversationId} does not exist`);

    const providerInfo = this.providerInfoFor(options.providerId, options.model as any);
    const model = providerInfo.model;
    const adapter = openaiText(model as any, clientOptionsForProvider(providerInfo.input));

    logger.info({
      msg: "InteractiveAssistant reply sequence started (Code Mode)",
      conversationId,
      model,
      messageLength: message?.length ?? 0,
      hasScreenFrame: !!screenFrame,
      attachmentsCount: options.attachmentPaths?.length ?? 0
    });

    const toolCalls: AssistantReply["toolCalls"] = [];
    const widgets: AssistantWidget[] = [];

    const tanstackTools = getTanstackTools(this.actions, this.db, conversationId, widgets, toolCalls);

    const { tool: codeModeTool, systemPrompt: codeModeSystemPrompt } = createCodeMode({
      driver: createQuickJSIsolateDriver(),
      tools: tanstackTools,
      timeout: 30000,
    });

    const attachmentNote = options.attachmentPaths?.length
      ? `\nUploaded files are available on the host at:\n${options.attachmentPaths.map((path) => `- ${path}`).join("\n")}`
      : "";
      
    const baseSystemPrompt = `You are the product intelligence assistant. You can freely perform internal application actions and unrestricted host filesystem/shell actions. External product sources are permanently read-only. Be explicit about evidence and uncertainty.${attachmentNote}`;
    
    const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = await this.getChatMessages(conversationId, message, screenFrame, options.attachmentPaths);

    let text = "";
    let responseId: string = crypto.randomUUID();

    const abortController = new AbortController();
    if (options.signal) {
      options.signal.addEventListener("abort", () => abortController.abort());
    }

    try {
      const stream = chat({
        adapter,
        systemPrompts: [baseSystemPrompt, codeModeSystemPrompt],
        tools: [codeModeTool],
        messages: chatMessages as any,
        abortController,
      });

      for await (const chunk of stream) {
        if ("id" in chunk && chunk.id) {
            responseId = chunk.id as string;
        }

        if (chunk.type === EventType.TEXT_MESSAGE_CONTENT) {
          const delta = (chunk as any).text || "";
          if (delta) {
            text += delta;
            options.onEvent?.("text", { delta });
          }
        } else if (chunk.type === EventType.CUSTOM) {
            // Forward custom events if they arrive through stream
            const customEvent = chunk as any;
            const type = customEvent.eventName || customEvent.eventType || customEvent.type;
            const data = customEvent.value || customEvent.data || chunk;
            if (type && type.startsWith("code_mode:")) {
              options.onEvent?.(type, data);
            }
        } else if (chunk.type === EventType.TOOL_CALL_START) {
          if ((chunk as any).toolName === "execute_typescript") {
              const input = (chunk as any).args || (chunk as any).arguments || {};
              options.onEvent?.("tool", { phase: "started", name: (chunk as any).toolName, input });
          }
        } else if (chunk.type === EventType.TOOL_CALL_RESULT) {
          if ((chunk as any).toolName === "execute_typescript") {
             const input = (chunk as any).args || (chunk as any).arguments || {};
             const output = (chunk as any).result || (chunk as any).output || {};
             options.onEvent?.("tool", { phase: "completed", name: (chunk as any).toolName, input, output });
             toolCalls.push({ name: (chunk as any).toolName, input, output });
             widgets.push(...widgetsForToolCall((chunk as any).toolName, input, output));
          }
        }
      }
    } catch (streamError) {
      logger.error({
        msg: "Error during chat completion streaming",
        conversationId,
        error: (streamError as Error).message,
      });
      throw streamError;
    }

    logger.info({
      msg: "InteractiveAssistant reply sequence completed",
      conversationId,
      textLength: text.length,
      toolCallsCount: toolCalls.length,
      widgetsCount: widgets.length
    });

    return { conversationId, text, responseId, toolCalls, widgets };
  }

  async generateTitle(message: string, providerId?: number | null, model?: string): Promise<string> {
    const providerInfo = this.providerInfoFor(providerId, model);
    const resolvedModel = providerInfo.model;
    const client = createOpenAIClient(providerInfo.input);
    
    logger.info({
      msg: "Requesting AI-generated conversation title",
      model: resolvedModel,
      messagePreview: message?.slice(0, 60)
    });
    try {
      const result = await client.chat.completions.create({
        model: resolvedModel,
        messages: [{ role: "user", content: `Create a concise conversation title of at most six words. Return only the title.\n\n${message}` }]
      });
      const title = (result.choices[0]?.message?.content ?? "New conversation").trim().replace(/^["']|["']$/g, "");
      logger.info({
        msg: "Successfully generated conversation title",
        title
      });
      return title;
    } catch (err) {
      logger.error({
        msg: "Failed to generate conversation title",
        error: (err as Error).message
      });
      return "New Conversation";
    }
  }

  private providerInfoFor(providerId?: number | null, model?: string): { input: ProviderClientOptionsInput; model: string } {
    const provider = providerId ? this.db.llmProvider(providerId) : this.db.getDefaultLLMProvider();
    if (provider) {
        return { 
            input: { ...JSON.parse(provider.configJson), provider: provider.provider } as ProviderClientOptionsInput, 
            model: model || provider.model 
        };
    }
    return {
      input: { provider: "openai", apiKey: this.fallbackApiKey, baseURL: this.fallbackBaseURL },
      model: model || this.fallbackModel
    };
  }

  private async getChatMessages(conversationId: number, currentMessage: string, screenFrame?: string, attachmentPaths: string[] = []): Promise<OpenAI.Chat.ChatCompletionMessageParam[]> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    const stored = this.db.listMessages(conversationId);
    for (const item of stored) {
      if (!item.content || (item.role === "user" && item.content === currentMessage && item.id === stored.at(-2)?.id)) continue;
      messages.push({ role: item.role, content: item.content });
    }
    const nativeImages = await Promise.all(attachmentPaths.map(async (path) => {
      const file = Bun.file(path);
      if (!file.type.startsWith("image/")) return null;
      return { type: "image_url" as const, image_url: { url: `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`, detail: "low" as const } };
    }));
    const images = nativeImages.filter((item): item is NonNullable<typeof item> => item !== null);
    if (screenFrame || images.length) messages.push({ role: "user", content: [{ type: "text", text: currentMessage || "Inspect the attached files." }, ...(screenFrame ? [{ type: "image_url" as const, image_url: { url: screenFrame, detail: "low" as const } }] : []), ...images] });
    else messages.push({ role: "user", content: currentMessage || "Inspect the attached files." });
    return messages;
  }
}
