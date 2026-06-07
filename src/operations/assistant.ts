import type { JsonObject } from "../types.ts";
import { ActionRegistry } from "./actions.ts";
import { OperationsDatabase } from "./database.ts";

interface FunctionCall {
  type: "function_call";
  call_id: string;
  name: string;
  arguments: string;
}

interface ResponseResult {
  id: string;
  output_text?: string;
  output?: Array<FunctionCall | { type: string; content?: Array<{ type?: string; text?: string }> }>;
}

export interface AssistantReply {
  conversationId: number;
  text: string;
  responseId: string;
  toolCalls: Array<{ name: string; input: unknown; output: unknown }>;
}

function outputText(response: ResponseResult): string {
  if (response.output_text) return response.output_text;
  return response.output?.flatMap((item) => "content" in item ? item.content ?? [] : []).find((item) => item.type === "output_text")?.text ?? "";
}

export class InteractiveAssistant {
  constructor(
    private readonly db: OperationsDatabase,
    private readonly actions: ActionRegistry,
    private readonly products: JsonObject[],
    private readonly apiKey = process.env.OPENAI_API_KEY,
    private readonly model = process.env.OPENAI_MODEL ?? "gpt-4.1",
    private readonly fetchImpl: typeof fetch = fetch
  ) {
    if (!apiKey) throw new Error("OPENAI_API_KEY is required for the assistant");
  }

  async reply(conversationId: number, message: string): Promise<AssistantReply> {
    const conversation = this.db.conversation(conversationId);
    if (!conversation) throw new Error(`Conversation ${conversationId} does not exist`);
    this.db.addMessage(conversationId, "user", message);
    const toolCalls: AssistantReply["toolCalls"] = [];
    let response = await this.createResponse({
      input: message,
      previousResponseId: conversation.previousResponseId
    });
    for (let iteration = 0; iteration < 12; iteration += 1) {
      const calls = (response.output ?? []).filter((item): item is FunctionCall => item.type === "function_call");
      if (!calls.length) break;
      const outputs = [];
      for (const call of calls) {
        const input = JSON.parse(call.arguments || "{}") as Record<string, unknown>;
        const output = await this.actions.execute(call.name, input, { db: this.db, actor: `assistant:${conversationId}`, products: this.products });
        toolCalls.push({ name: call.name, input, output });
        outputs.push({ type: "function_call_output", call_id: call.call_id, output: JSON.stringify(output) });
      }
      response = await this.createResponse({ input: outputs, previousResponseId: response.id });
    }
    const text = outputText(response);
    this.db.setConversationResponse(conversationId, response.id);
    this.db.addMessage(conversationId, "assistant", text, { responseId: response.id, toolCalls });
    return { conversationId, text, responseId: response.id, toolCalls };
  }

  private async createResponse(params: { input: unknown; previousResponseId?: string | null }): Promise<ResponseResult> {
    const internalTools = this.actions.list().map((action) => ({
      type: "function",
      name: action.name,
      description: action.description,
      parameters: { type: "object", additionalProperties: true }
    }));
    const response = await this.fetchImpl("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        previous_response_id: params.previousResponseId ?? undefined,
        instructions: "You are the product intelligence assistant. You can freely perform internal application actions. External product sources are permanently read-only. Use web search and code interpreter when useful. Be explicit about evidence and uncertainty.",
        input: params.input,
        tools: [...internalTools, { type: "web_search" }, { type: "code_interpreter", container: { type: "auto" } }]
      })
    });
    if (!response.ok) throw new Error(`OpenAI assistant failed: ${response.status} ${await response.text()}`);
    return response.json() as Promise<ResponseResult>;
  }
}
