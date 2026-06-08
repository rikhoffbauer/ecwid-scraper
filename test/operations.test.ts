import { afterEach, describe, expect, test } from "bun:test";
import { createDefaultActionRegistry } from "../src/server/operations/actions.ts";
import { runAutomationsForEvents } from "../src/server/operations/automations.ts";
import { OperationsDatabase } from "../src/server/operations/database.ts";
import { OpenAiAssistantAnalyzer } from "../src/server/operations/assistant-analyzer.ts";
import type { JsonObject, ProductEvent } from "../src/shared/types.ts";

const databases: OperationsDatabase[] = [];

afterEach(() => {
  for (const database of databases.splice(0)) database.close();
});

function database(): OperationsDatabase {
  const value = new OperationsDatabase(":memory:");
  databases.push(value);
  return value;
}

function products(): JsonObject[] {
  return [
    { id: "rare", name: "Rare value", price: 1 },
    { id: "2", name: "Two", price: 20 },
    { id: "3", name: "Three", price: 30 },
    { id: "4", name: "Four", price: 40 },
    { id: "5", name: "Five", price: 50 },
    { id: "6", name: "Six", price: 60 },
    { id: "7", name: "Seven", price: 70 },
    { id: "8", name: "Eight", price: 80 },
    { id: "9", name: "Nine", price: 90 },
    { id: "10", name: "Ten", price: 100 }
  ];
}

describe("operational actions and automations", () => {
  test("persists conversation lifecycle, assistant runs, partial messages, and ordered events", () => {
    const db = database();
    const conversation = db.createConversation();
    db.renameConversation(conversation.id, "Manual title");
    const user = db.addMessage(conversation.id, "user", "Inspect this");
    const assistant = db.addMessage(conversation.id, "assistant", "");
    const run = db.createAssistantRun({
      conversationId: conversation.id,
      userMessageId: user.id,
      assistantMessageId: assistant.id,
      providerId: null,
      model: "gpt-test"
    });

    db.updateMessageContent(assistant.id, "Partial");
    const first = db.addAssistantRunEvent(run.id, conversation.id, "text", { delta: "Partial" });
    const second = db.addAssistantRunEvent(run.id, conversation.id, "tool", { name: "shell", input: { command: "pwd" } });
    db.finishAssistantRun(run.id, "completed");
    db.archiveConversation(conversation.id, true);

    expect(db.conversation(conversation.id)).toMatchObject({ title: "Manual title", titleSource: "manual", archivedAt: expect.any(String) });
    expect(db.listConversations(false)).toEqual([]);
    expect(db.listConversations(true)).toHaveLength(1);
    expect(db.listMessages(conversation.id).at(-1)?.content).toBe("Partial");
    expect(db.listAssistantRuns(conversation.id)[0]).toMatchObject({ status: "completed", model: "gpt-test" });
    expect(db.listAssistantRunEvents(conversation.id, first.id)).toEqual([second]);
  });

  test("marks unfinished assistant runs as interrupted and deletes conversation data", () => {
    const db = database();
    const conversation = db.createConversation();
    const user = db.addMessage(conversation.id, "user", "Keep working");
    const assistant = db.addMessage(conversation.id, "assistant", "");
    db.createAssistantRun({ conversationId: conversation.id, userMessageId: user.id, assistantMessageId: assistant.id, providerId: null, model: "gpt-test" });

    expect(db.markInterruptedAssistantRuns()).toBe(1);
    expect(db.listAssistantRuns(conversation.id)[0]).toMatchObject({ status: "failed", error: "Server restarted while response was generating" });
    expect(db.deleteConversation(conversation.id)).toBe(true);
    expect(db.conversation(conversation.id)).toBeNull();
  });

  test("creates an unnamed LLM provider using its provider kind as the display label", () => {
    const db = database();
    const provider = db.addLLMProvider({ provider: "gemini", configJson: "{}", model: "gemini-test", isDefault: true });
    expect(provider).toMatchObject({ name: "Gemini", provider: "gemini", model: "gemini-test", isDefault: true });
  });

  test("executes internal actions and records their audit trail", async () => {
    const db = database();
    const actions = createDefaultActionRegistry();
    const output = await actions.execute("flags.add", {
      sourceId: "source-1",
      productId: "rare",
      label: "review",
      rationale: "Interesting",
      confidence: 0.9
    }, { db, actor: "assistant", products: products() });

    expect(output).toMatchObject({ sourceId: "source-1", productId: "rare", label: "review" });
    expect(db.listFlags()).toHaveLength(1);
    expect(db.listAudit()).toEqual([expect.objectContaining({ action: "flags.add", actor: "assistant", status: "succeeded" })]);
    await actions.execute("flags.remove", { sourceId: "source-1", productId: "rare", label: "review" }, { db, actor: "assistant", products: products() });
    expect(db.listFlags()).toHaveLength(0);
  });

  test("runs exceptional-value automation once per event", async () => {
    const db = database();
    const actions = createDefaultActionRegistry();
    const rule = db.createRule({
      name: "Rare value",
      instruction: "flag any product offerings that are exceptional value for money (very rare)",
      eventTypes: ["product.created", "product.field_changed"],
      sourceIds: []
    });
    const event: ProductEvent = {
      eventId: "event-1",
      eventType: "product.created",
      schemaVersion: 1,
      source: "ecwid",
      storeId: "source-1",
      productId: "rare",
      runId: "run",
      observedAt: "2026-06-07T00:00:00Z",
      currentHash: "hash",
      product: { id: "rare", name: "Rare value", price: 1 }
    };

    const assistant = {
      async analyze() {
        return {
          summary: "AI researched comparable offerings and judged this exceptionally rare value.",
          actions: [{
            name: "flags.add",
            input: {
              sourceId: "source-1",
              productId: "rare",
              label: "exceptional-value",
              rationale: "AI comparison found this substantially below credible comparable offerings.",
              confidence: 0.91
            }
          }]
        };
      }
    };
    const first = await runAutomationsForEvents({ db, actions, assistant, events: [event], products: products() });
    const second = await runAutomationsForEvents({ db, actions, assistant, events: [event], products: products() });

    expect(first).toEqual([expect.objectContaining({ ruleId: rule.id, status: "succeeded" })]);
    expect(second).toEqual([]);
    expect(db.listFlags()).toEqual([expect.objectContaining({ label: "exceptional-value", productId: "rare" })]);
    expect(db.listAudit()).toHaveLength(1);
  });

  test("OpenAiAssistantAnalyzer can be constructed with a default LLM provider without throwing", () => {
    const db = database();
    db.addLLMProvider({
      provider: "gemini",
      configJson: '{"apiKey":"test"}',
      model: "gemini-test",
      isDefault: true
    });
    const analyzer = new OpenAiAssistantAnalyzer(db);
    expect(analyzer).toBeDefined();
  });
});
