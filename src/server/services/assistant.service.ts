import { OperationsDatabase, type LLMProvider } from "../operations/database.ts";
import { InteractiveAssistant } from "../operations/assistant.ts";
import { AssistantRunCoordinator } from "../operations/assistant-runs.ts";
import { createDefaultActionRegistry } from "../operations/actions.ts";
import { createOpenAIClient, type ProviderClientOptionsInput } from "../lib/openai-compatible.ts";

export class AssistantService {
  private assistant: InteractiveAssistant | null = null;
  private assistantRuns: AssistantRunCoordinator | null = null;

  constructor(private readonly db: OperationsDatabase, assistantOverride?: any) {
    const actions = createDefaultActionRegistry();
    if (assistantOverride) {
      this.assistant = assistantOverride;
      this.assistantRuns = new AssistantRunCoordinator(db, this.assistant as any);
    } else if (process.env.OPENAI_API_KEY || db.getDefaultLLMProvider()) {
      this.assistant = new InteractiveAssistant(db, actions);
      this.assistantRuns = new AssistantRunCoordinator(db, this.assistant);
    }
  }

  // Covers /api/assistant-runs
  cancelRun(id: number) {
    return this.assistantRuns?.cancel(id) ?? false;
  }

  getRun(id: number) {
    return this.db.assistantRun(id);
  }

  // Covers /api/conversations
  listConversations(archived: boolean) {
    return this.db.listConversations(archived);
  }

  createConversation(title?: string) {
    return this.db.createConversation(title);
  }

  updateConversation(id: number, input: { title?: string; archived?: boolean }) {
    let conversation = input.title?.trim()
      ? this.db.renameConversation(id, input.title)
      : this.db.conversation(id);
    if (input.archived !== undefined) {
      conversation = this.db.archiveConversation(id, input.archived);
    }
    return conversation;
  }

  async deleteConversation(id: number, removeAttachments: (id: number) => Promise<void>) {
    const active = this.db
      .listAssistantRuns(id)
      .find((run: any) => run.status === "queued" || run.status === "running");
    if (active) this.assistantRuns?.cancel(active.id);
    const removed = this.db.deleteConversation(id);
    if (removed) {
      await removeAttachments(id);
    }
    return removed;
  }

  listMessages(conversationId: number) {
    return this.db.listMessages(conversationId);
  }

  listRuns(conversationId: number) {
    return this.db.listAssistantRuns(conversationId);
  }

  listEvents(conversationId: number, afterId: number) {
    return this.db.listAssistantRunEvents(conversationId, afterId);
  }

  startRun(input: {
    conversationId: number;
    message: string;
    screenFrame?: string;
    model: string;
    providerId: number | null;
    attachmentPaths: string[];
  }) {
    if (!this.assistantRuns) {
      throw new Error("No LLM provider is configured");
    }
    return this.assistantRuns.start(input);
  }

  // Covers /api/llm-providers
  listProviders() {
    return this.db.listLLMProviders();
  }

  addProvider(input: Omit<LLMProvider, "id" | "createdAt" | "updatedAt">) {
    return this.db.addLLMProvider(input);
  }

  updateProvider(id: number, input: Partial<Omit<LLMProvider, "id" | "createdAt" | "updatedAt">>) {
    return this.db.updateLLMProvider(id, input);
  }

  deleteProvider(id: number) {
    return this.db.deleteLLMProvider(id);
  }

  async testProvider(input: { provider: string; configJson: string; model: string }) {
    const config = {
      ...JSON.parse(input.configJson),
      provider: input.provider,
    } as ProviderClientOptionsInput;
    const client = createOpenAIClient(config);
    let completion;
    try {
      completion = await client.chat.completions.create({
        model: input.model,
        messages: [{ role: "user", content: "Reply with 'OK'" }],
        max_tokens: 5,
      });
    } catch (chatError) {
      const errMessage = (chatError as Error).message;
      if (
        errMessage.includes("max_tokens") ||
        errMessage.includes("max_completion_tokens")
      ) {
        completion = await client.chat.completions.create({
          model: input.model,
          messages: [{ role: "user", content: "Reply with 'OK'" }],
          max_completion_tokens: 5,
        });
      } else {
        throw chatError;
      }
    }
    return completion.choices[0]?.message?.content;
  }

  async listModels(input: { provider: string; configJson: string }) {
    const config = {
      ...JSON.parse(input.configJson),
      provider: input.provider,
    } as ProviderClientOptionsInput;
    const client = createOpenAIClient(config);
    const page = await client.models.list();
    return page.data.map((model: any) => model.id).sort();
  }

  // Covers settings
  getSettings() {
    return {
      titleModel: this.db.getSetting("assistant.titleModel") ?? null,
    };
  }

  updateSettings(titleModel: any) {
    if (titleModel !== undefined) {
      this.db.setSetting("assistant.titleModel", titleModel);
    }
    return this.getSettings();
  }

  async createRealtimeSecret() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
    const response = await fetch(
      "https://api.openai.com/v1/realtime/client_secrets",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          expires_after: { anchor: "created_at", seconds: 600 },
          session: {
            type: "realtime",
            model: process.env.OPENAI_REALTIME_MODEL ?? "gpt-realtime",
            instructions:
              "You are the product intelligence assistant. External product sources are read-only.",
          },
        }),
      },
    );
    if (!response.ok) {
      throw new Error(`Realtime API Error: ${response.statusText}`);
    }
    return response.text();
  }
}
