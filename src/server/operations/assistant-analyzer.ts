import type { JsonObject, ProductEvent } from "../../shared/types.ts";
import { OperationsDatabase, type AutomationRule } from "./database.ts";
import OpenAI from "openai";
import { createOpenAIClient, type ProviderClientOptionsInput } from "../lib/openai-compatible.ts";
import { logger } from "../lib/logger.ts";

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

export class OpenAiAssistantAnalyzer implements AssistantAnalyzer {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(
    private readonly db: OperationsDatabase,
    apiKey = process.env.OPENAI_API_KEY,
    model = process.env.OPENAI_MODEL ?? "gpt-4.1",
    baseURL = process.env.OPENAI_BASE_URL
  ) {
    const defaultProvider = this.db.getDefaultLLMProvider();
    if (defaultProvider) {
      this.model = defaultProvider.model;
      this.client = createOpenAIClient({
        ...JSON.parse(defaultProvider.configJson),
        provider: defaultProvider.provider,
      } as ProviderClientOptionsInput);
    } else {
      this.model = model;
      this.client = createOpenAIClient({
        provider: "openai",
        apiKey,
        baseURL,
      });
    }
  }

  async analyze(input: Parameters<AssistantAnalyzer["analyze"]>[0]): Promise<AssistantDecision> {
    logger.info({
      msg: "Executing AssistantAnalyzer analysis with LLM",
      model: this.model,
      ruleName: input.rule.name,
      eventStoreId: input.event.storeId,
      eventProductId: input.event.productId,
      trackedProductsCount: input.trackedProducts.length,
    });
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
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
        response_format: {
          type: "json_schema",
          json_schema: {
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
      });

      const text = response.choices[0]?.message?.content;
      if (!text) {
        throw new Error("OpenAI product analysis returned no structured output");
      }
      
      const decision = JSON.parse(text) as AssistantDecision;
      logger.debug({
        msg: "AssistantAnalyzer LLM analysis succeeded",
        model: this.model,
        summary: decision.summary,
        actionsCount: decision.actions.length,
      });
      return decision;
    } catch (err) {
      logger.error({
        msg: "AssistantAnalyzer LLM analysis failed",
        model: this.model,
        ruleName: input.rule.name,
        error: (err as Error).message,
      });
      throw err;
    }
  }
}
