import type { AssistantReply, AssistantReplyOptions, InteractiveAssistant } from "./assistant.ts";
import { OperationsDatabase } from "./database.ts";

type RunAssistant = {
  reply(conversationId: number, message: string, screenFrame?: string, options?: AssistantReplyOptions): Promise<AssistantReply>;
  generateTitle?(message: string, providerId?: number | null, model?: string): Promise<string>;
};

export class AssistantRunCoordinator {
  private controllers = new Map<number, AbortController>();

  constructor(private readonly db: OperationsDatabase, private readonly assistant: RunAssistant) {
    db.markInterruptedAssistantRuns();
  }

  start(input: { conversationId: number; message: string; screenFrame?: string; providerId?: number | null; model: string; attachmentPaths?: string[] }): { runId: number } {
    const active = this.db.listAssistantRuns(input.conversationId).find((run) => run.status === "queued" || run.status === "running");
    if (active) throw new Error("A response is already generating for this conversation");
    const user = this.db.addMessage(input.conversationId, "user", input.message, { screenFrame: input.screenFrame, attachments: input.attachmentPaths ?? [], providerId: input.providerId ?? null, model: input.model });
    const assistantMessage = this.db.addMessage(input.conversationId, "assistant", "", { tools: [], streaming: true });
    const run = this.db.createAssistantRun({ conversationId: input.conversationId, userMessageId: user.id, assistantMessageId: assistantMessage.id, providerId: input.providerId ?? null, model: input.model });
    const controller = new AbortController();
    this.controllers.set(run.id, controller);
    void this.execute(run.id, input, controller).catch((e) => {
      // Ignore errors caused by the conversation being deleted concurrently
    });
    return { runId: run.id };
  }

  cancel(runId: number): boolean {
    const changed = this.db.requestAssistantRunCancellation(runId);
    this.controllers.get(runId)?.abort();
    return changed;
  }

  private async execute(runId: number, input: { conversationId: number; message: string; screenFrame?: string; providerId?: number | null; model: string; attachmentPaths?: string[] }, controller: AbortController): Promise<void> {
    const run = this.db.setAssistantRunRunning(runId)!;
    this.db.addAssistantRunEvent(runId, input.conversationId, "status", { state: "thinking" });
    let text = "";
    let pendingDelta = "";
    let flushTimer: ReturnType<typeof setTimeout> | undefined;
    const tools: unknown[] = [];
    const flushText = () => {
      if (!pendingDelta) return;
      this.db.addAssistantRunEvent(runId, input.conversationId, "text", { delta: pendingDelta });
      pendingDelta = "";
      this.db.updateMessageContent(run.assistantMessageId, text, { tools, streaming: true });
      if (flushTimer) clearTimeout(flushTimer);
      flushTimer = undefined;
    };
    try {
      const result = await this.assistant.reply(input.conversationId, input.message, input.screenFrame, {
        providerId: input.providerId, model: input.model, attachmentPaths: input.attachmentPaths, signal: controller.signal,
        onEvent: (event, data) => {
          if (event === "text") {
            const delta = String((data as { delta?: unknown }).delta ?? "");
            text += delta; pendingDelta += delta;
            flushTimer ??= setTimeout(flushText, 80);
          } else {
            flushText();
            this.db.addAssistantRunEvent(runId, input.conversationId, event, data);
            if (event === "tool") { tools.push(data); this.db.updateMessageContent(run.assistantMessageId, text, { tools, streaming: true }); }
          }
        }
      });
      flushText();
      this.db.updateMessageContent(run.assistantMessageId, result.text, { responseId: result.responseId, toolCalls: result.toolCalls, widgets: result.widgets, tools, streaming: false });
      this.db.finishAssistantRun(runId, "completed");
      this.db.addAssistantRunEvent(runId, input.conversationId, "done", { runId });
      const conversation = this.db.conversation(input.conversationId);
      if (conversation?.titleSource === "default") void this.title(input.conversationId, input.message);
    } catch (error) {
      flushText();
      const cancelled = controller.signal.aborted;
      try {
        this.db.updateMessageContent(run.assistantMessageId, text, { tools, streaming: false, error: (error as Error).message });
        this.db.finishAssistantRun(runId, cancelled ? "cancelled" : "failed", (error as Error).message);
        this.db.addAssistantRunEvent(runId, input.conversationId, cancelled ? "cancelled" : "error", { error: (error as Error).message });
      } catch (innerError) {
        // Conversation or run might have been deleted concurrently
      }
    } finally {
      if (flushTimer) clearTimeout(flushTimer);
      this.controllers.delete(runId);
    }
  }

  private async title(conversationId: number, message: string): Promise<void> {
    if (!this.assistant.generateTitle) return;
    try {
      const settings = this.db.getSetting<{ providerId?: number | null; model?: string }>("assistant.titleModel") ?? {};
      const title = await this.assistant.generateTitle(message, settings.providerId, settings.model);
      if (this.db.conversation(conversationId)?.titleSource === "default") this.db.renameConversation(conversationId, title, "ai");
    } catch {}
  }
}
