import type { JsonObject, ProductEvent } from "../types.ts";
import type { AutomationRule } from "./database.ts";

export interface AssistantDecision {
  summary: string;
  actions: Array<{
    name: string;
    input: Record<string, unknown>;
  }>;
}

export interface AssistantAnalyzer {
  analyze(input: {
    rule: AutomationRule;
    event: ProductEvent;
    product: JsonObject | null;
    trackedProducts: JsonObject[];
  }): Promise<AssistantDecision>;
}

interface ResponsesApiResult {
  output_text?: string;
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
}

function responseText(response: ResponsesApiResult): string {
  if (response.output_text) return response.output_text;
  return response.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text ?? "";
}

export class OpenAiAssistantAnalyzer implements AssistantAnalyzer {
  constructor(
    private readonly apiKey = process.env.OPENAI_API_KEY,
    private readonly model = process.env.OPENAI_MODEL ?? "gpt-4.1",
    private readonly fetchImpl: typeof fetch = fetch
  ) {
    if (!apiKey) throw new Error("OPENAI_API_KEY is required for AI product analysis");
  }

  async analyze(input: Parameters<AssistantAnalyzer["analyze"]>[0]): Promise<AssistantDecision> {
    const response = await this.fetchImpl("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        tools: [{ type: "web_search" }],
        input: [
          {
            role: "system",
            content: "Analyze tracked products according to the user's rule. Source stores are read-only. Return only internal actions. Be conservative with rare or exceptional claims and explain evidence."
          },
          {
            role: "user",
            content: JSON.stringify({
              instruction: input.rule.instruction,
              event: input.event,
              product: input.product,
              trackedProductSample: input.trackedProducts.slice(0, 250)
            })
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "product_analysis_decision",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["summary", "actions"],
              properties: {
                summary: { type: "string" },
                actions: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["name", "input"],
                    properties: {
                      name: { type: "string", enum: ["flags.add"] },
                      input: {
                        type: "object",
                        additionalProperties: false,
                        required: ["sourceId", "productId", "label", "rationale", "confidence"],
                        properties: {
                          sourceId: { type: "string" },
                          productId: { type: "string" },
                          label: { type: "string" },
                          rationale: { type: "string" },
                          confidence: { type: "number" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      })
    });
    if (!response.ok) throw new Error(`OpenAI product analysis failed: ${response.status} ${await response.text()}`);
    const text = responseText(await response.json() as ResponsesApiResult);
    if (!text) throw new Error("OpenAI product analysis returned no structured output");
    return JSON.parse(text) as AssistantDecision;
  }
}
