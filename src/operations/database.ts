import { mkdirSync } from "node:fs";
import path from "node:path";
import { Database } from "bun:sqlite";

export interface ProductFlag {
  id: number;
  sourceId: string;
  productId: string;
  label: string;
  rationale: string;
  confidence: number | null;
  createdAt: string;
  createdBy: string;
}

export interface AutomationRule {
  id: number;
  name: string;
  instruction: string;
  enabled: boolean;
  eventTypes: string[];
  sourceIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditEntry {
  id: number;
  action: string;
  actor: string;
  input: unknown;
  output: unknown;
  status: "succeeded" | "failed";
  error?: string;
  createdAt: string;
}

export interface Conversation {
  id: number;
  title: string;
  previousResponseId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessage {
  id: number;
  conversationId: number;
  role: "user" | "assistant";
  content: string;
  metadata: unknown;
  createdAt: string;
}

export class OperationsDatabase {
  readonly db: Database;

  constructor(filePath = process.env.OPERATIONS_DB_PATH ?? ".ecwid-sync/operations.sqlite") {
    if (filePath !== ":memory:") mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
    this.db = new Database(filePath, { create: true });
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
    this.migrate();
  }

  close(): void {
    this.db.close();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS product_flags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        label TEXT NOT NULL,
        rationale TEXT NOT NULL DEFAULT '',
        confidence REAL,
        created_at TEXT NOT NULL,
        created_by TEXT NOT NULL,
        UNIQUE(source_id, product_id, label)
      );
      CREATE TABLE IF NOT EXISTS automation_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        instruction TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        event_types_json TEXT NOT NULL,
        source_ids_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS automation_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rule_id INTEGER NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
        event_id TEXT NOT NULL,
        source_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        status TEXT NOT NULL,
        output_json TEXT,
        error TEXT,
        created_at TEXT NOT NULL,
        UNIQUE(rule_id, event_id)
      );
      CREATE TABLE IF NOT EXISTS action_audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        actor TEXT NOT NULL,
        input_json TEXT NOT NULL,
        output_json TEXT,
        status TEXT NOT NULL,
        error TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        previous_response_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS conversation_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        metadata_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
  }

  addFlag(input: Omit<ProductFlag, "id" | "createdAt">): ProductFlag {
    const createdAt = new Date().toISOString();
    this.db.query(`
      INSERT INTO product_flags (source_id, product_id, label, rationale, confidence, created_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(source_id, product_id, label) DO UPDATE SET
        rationale = excluded.rationale,
        confidence = excluded.confidence,
        created_at = excluded.created_at,
        created_by = excluded.created_by
    `).run(input.sourceId, input.productId, input.label, input.rationale, input.confidence, createdAt, input.createdBy);
    return this.mapFlag(this.db.query("SELECT * FROM product_flags WHERE source_id = ? AND product_id = ? AND label = ?")
      .get(input.sourceId, input.productId, input.label) as Record<string, unknown>);
  }

  listFlags(sourceId?: string, productId?: string): ProductFlag[] {
    const rows = sourceId && productId
      ? this.db.query("SELECT * FROM product_flags WHERE source_id = ? AND product_id = ? ORDER BY created_at DESC").all(sourceId, productId)
      : sourceId
        ? this.db.query("SELECT * FROM product_flags WHERE source_id = ? ORDER BY created_at DESC").all(sourceId)
        : this.db.query("SELECT * FROM product_flags ORDER BY created_at DESC").all();
    return (rows as Record<string, unknown>[]).map((row) => this.mapFlag(row));
  }

  createRule(input: Pick<AutomationRule, "name" | "instruction" | "eventTypes" | "sourceIds"> & { enabled?: boolean }): AutomationRule {
    const now = new Date().toISOString();
    const result = this.db.query(`
      INSERT INTO automation_rules (name, instruction, enabled, event_types_json, source_ids_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(input.name, input.instruction, input.enabled === false ? 0 : 1, JSON.stringify(input.eventTypes), JSON.stringify(input.sourceIds), now, now);
    return this.rule(Number(result.lastInsertRowid))!;
  }

  rule(id: number): AutomationRule | null {
    const row = this.db.query("SELECT * FROM automation_rules WHERE id = ?").get(id) as Record<string, unknown> | null;
    return row ? this.mapRule(row) : null;
  }

  listRules(enabledOnly = false): AutomationRule[] {
    const rows = enabledOnly
      ? this.db.query("SELECT * FROM automation_rules WHERE enabled = 1 ORDER BY id").all()
      : this.db.query("SELECT * FROM automation_rules ORDER BY id").all();
    return (rows as Record<string, unknown>[]).map((row) => this.mapRule(row));
  }

  hasAutomationRun(ruleId: number, eventId: string): boolean {
    return !!this.db.query("SELECT 1 FROM automation_runs WHERE rule_id = ? AND event_id = ?").get(ruleId, eventId);
  }

  recordAutomationRun(input: { ruleId: number; eventId: string; sourceId: string; productId: string; status: string; output?: unknown; error?: string }): void {
    this.db.query(`
      INSERT INTO automation_runs (rule_id, event_id, source_id, product_id, status, output_json, error, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(rule_id, event_id) DO UPDATE SET status = excluded.status, output_json = excluded.output_json, error = excluded.error
    `).run(input.ruleId, input.eventId, input.sourceId, input.productId, input.status, input.output === undefined ? null : JSON.stringify(input.output), input.error ?? null, new Date().toISOString());
  }

  recordAudit(input: Omit<AuditEntry, "id" | "createdAt">): void {
    this.db.query(`
      INSERT INTO action_audit (action, actor, input_json, output_json, status, error, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(input.action, input.actor, JSON.stringify(input.input), input.output === undefined ? null : JSON.stringify(input.output), input.status, input.error ?? null, new Date().toISOString());
  }

  listAudit(): AuditEntry[] {
    return (this.db.query("SELECT * FROM action_audit ORDER BY id DESC").all() as Record<string, unknown>[]).map((row) => ({
      id: Number(row.id),
      action: String(row.action),
      actor: String(row.actor),
      input: JSON.parse(String(row.input_json)),
      output: row.output_json ? JSON.parse(String(row.output_json)) : undefined,
      status: row.status as AuditEntry["status"],
      error: row.error ? String(row.error) : undefined,
      createdAt: String(row.created_at)
    }));
  }

  createConversation(title = "New conversation"): Conversation {
    const now = new Date().toISOString();
    const result = this.db.query("INSERT INTO conversations (title, created_at, updated_at) VALUES (?, ?, ?)").run(title, now, now);
    return this.conversation(Number(result.lastInsertRowid))!;
  }

  conversation(id: number): Conversation | null {
    const row = this.db.query("SELECT * FROM conversations WHERE id = ?").get(id) as Record<string, unknown> | null;
    return row ? this.mapConversation(row) : null;
  }

  listConversations(): Conversation[] {
    return (this.db.query("SELECT * FROM conversations ORDER BY updated_at DESC").all() as Record<string, unknown>[]).map((row) => this.mapConversation(row));
  }

  setConversationResponse(id: number, responseId: string): void {
    this.db.query("UPDATE conversations SET previous_response_id = ?, updated_at = ? WHERE id = ?").run(responseId, new Date().toISOString(), id);
  }

  addMessage(conversationId: number, role: ConversationMessage["role"], content: string, metadata: unknown = {}): ConversationMessage {
    const createdAt = new Date().toISOString();
    const result = this.db.query(`
      INSERT INTO conversation_messages (conversation_id, role, content, metadata_json, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(conversationId, role, content, JSON.stringify(metadata), createdAt);
    this.db.query("UPDATE conversations SET updated_at = ? WHERE id = ?").run(createdAt, conversationId);
    return {
      id: Number(result.lastInsertRowid),
      conversationId,
      role,
      content,
      metadata,
      createdAt
    };
  }

  listMessages(conversationId: number): ConversationMessage[] {
    return (this.db.query("SELECT * FROM conversation_messages WHERE conversation_id = ? ORDER BY id").all(conversationId) as Record<string, unknown>[]).map((row) => ({
      id: Number(row.id),
      conversationId: Number(row.conversation_id),
      role: row.role as ConversationMessage["role"],
      content: String(row.content),
      metadata: JSON.parse(String(row.metadata_json)),
      createdAt: String(row.created_at)
    }));
  }

  private mapRule(row: Record<string, unknown>): AutomationRule {
    return {
      id: Number(row.id),
      name: String(row.name),
      instruction: String(row.instruction),
      enabled: Number(row.enabled) === 1,
      eventTypes: JSON.parse(String(row.event_types_json)) as string[],
      sourceIds: JSON.parse(String(row.source_ids_json)) as string[],
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    };
  }

  private mapFlag(row: Record<string, unknown>): ProductFlag {
    return {
      id: Number(row.id),
      sourceId: String(row.source_id),
      productId: String(row.product_id),
      label: String(row.label),
      rationale: String(row.rationale),
      confidence: row.confidence === null ? null : Number(row.confidence),
      createdAt: String(row.created_at),
      createdBy: String(row.created_by)
    };
  }

  private mapConversation(row: Record<string, unknown>): Conversation {
    return {
      id: Number(row.id),
      title: String(row.title),
      previousResponseId: row.previous_response_id ? String(row.previous_response_id) : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    };
  }
}
