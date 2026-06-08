import { mkdirSync } from "node:fs";
import path from "node:path";
import { Database } from "bun:sqlite";
import type { JsonObject, ProductEvent, StoreConfig } from "../../shared/types.ts";

function providerDisplayName(provider: string): string {
  return ({ openai: "OpenAI", openrouter: "OpenRouter", deepseek: "DeepSeek", gemini: "Gemini", vertex: "Vertex AI", litellm: "LiteLLM", custom: "Custom" } as Record<string, string>)[provider] ?? provider;
}

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
  titleSource: "default" | "ai" | "manual";
  previousResponseId: string | null;
  archivedAt: string | null;
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

export type AssistantRunStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export interface AssistantRun {
  id: number;
  conversationId: number;
  userMessageId: number;
  assistantMessageId: number;
  providerId: number | null;
  model: string;
  status: AssistantRunStatus;
  error: string | null;
  cancelRequested: boolean;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface AssistantRunEvent {
  id: number;
  runId: number;
  conversationId: number;
  event: string;
  data: unknown;
  createdAt: string;
}

export interface SavedSearch {
  id: number;
  name: string;
  query: string;
  sourceIds: string[];
  watched: boolean;
  enabled: boolean;
  intervalMinutes: number;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SavedSearchRun {
  id: number;
  searchId: number;
  status: string;
  resultCount: number;
  sourceResults: unknown;
  startedAt: string;
  completedAt: string;
}

export interface SavedSearchResult {
  searchId: number;
  sourceId: string;
  productId: string;
  hash: string;
  product: JsonObject;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface SavedSearchEvent {
  id: number;
  searchId: number;
  runId: number;
  sourceId: string;
  productId: string;
  eventType: "search_result.entered" | "search_result.changed" | "search_result.left";
  observedAt: string;
}

export interface LLMProvider {
  id: number;
  name?: string;
  provider: string; // e.g., "openai", "gemini", "vertex", "custom"
  configJson: string; // JSON string of ProviderClientOptionsInput
  model: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export class OperationsDatabase {
  readonly db: Database;

  constructor(filePath = process.env.OPERATIONS_DB_PATH ?? ".ecwid-sync/operations.sqlite") {
    if (filePath !== ":memory:") mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
    this.db = new Database(filePath, { create: true });
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
    this.backupBeforeProductOfferingMigration(filePath);
    this.migrate();
  }

  close(): void {
    this.db.close();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS stores (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        config_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        store_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        hash TEXT NOT NULL,
        product_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(store_id, product_id)
      );
      CREATE TABLE IF NOT EXISTS product_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id TEXT NOT NULL UNIQUE,
        store_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        run_id TEXT NOT NULL,
        observed_at TEXT NOT NULL,
        event_json TEXT NOT NULL
      );
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
        title_source TEXT NOT NULL DEFAULT 'default',
        previous_response_id TEXT,
        archived_at TEXT,
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
      CREATE TABLE IF NOT EXISTS assistant_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        user_message_id INTEGER NOT NULL REFERENCES conversation_messages(id) ON DELETE CASCADE,
        assistant_message_id INTEGER NOT NULL REFERENCES conversation_messages(id) ON DELETE CASCADE,
        provider_id INTEGER,
        model TEXT NOT NULL,
        status TEXT NOT NULL,
        error TEXT,
        cancel_requested INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        started_at TEXT,
        completed_at TEXT
      );
      CREATE TABLE IF NOT EXISTS assistant_run_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id INTEGER NOT NULL REFERENCES assistant_runs(id) ON DELETE CASCADE,
        conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        event TEXT NOT NULL,
        data_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS saved_searches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        query TEXT NOT NULL,
        source_ids_json TEXT NOT NULL,
        watched INTEGER NOT NULL DEFAULT 0,
        enabled INTEGER NOT NULL DEFAULT 1,
        interval_minutes INTEGER NOT NULL DEFAULT 30,
        next_run_at TEXT,
        last_run_at TEXT,
        last_run_status TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS saved_search_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        search_id INTEGER NOT NULL REFERENCES saved_searches(id) ON DELETE CASCADE,
        status TEXT NOT NULL,
        result_count INTEGER NOT NULL,
        source_results_json TEXT NOT NULL,
        started_at TEXT NOT NULL,
        completed_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS saved_search_results (
        search_id INTEGER NOT NULL REFERENCES saved_searches(id) ON DELETE CASCADE,
        source_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        hash TEXT NOT NULL,
        product_json TEXT NOT NULL,
        first_seen_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        PRIMARY KEY(search_id, source_id, product_id)
      );
      CREATE TABLE IF NOT EXISTS saved_search_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        search_id INTEGER NOT NULL REFERENCES saved_searches(id) ON DELETE CASCADE,
        run_id INTEGER NOT NULL REFERENCES saved_search_runs(id) ON DELETE CASCADE,
        source_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        observed_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS llm_providers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        provider TEXT NOT NULL,
        config_json TEXT NOT NULL,
        model TEXT NOT NULL,
        is_default INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // Backfill product_summary column
    try {
      this.db.exec("ALTER TABLE products ADD COLUMN product_summary TEXT;");
    } catch (e) {
      // Ignore if it already exists
    }
    for (const statement of [
      "ALTER TABLE conversations ADD COLUMN title_source TEXT NOT NULL DEFAULT 'default'",
      "ALTER TABLE conversations ADD COLUMN archived_at TEXT"
    ]) {
      try { this.db.exec(statement); } catch {}
    }

    const unmigrated = this.db.query("SELECT id FROM products WHERE product_summary IS NULL LIMIT 1").get();
    if (unmigrated) {
      while (true) {
        const rows = this.db.query("SELECT id FROM products WHERE product_summary IS NULL LIMIT 5000").all() as {id: number}[];
        if (rows.length === 0) break;
        this.db.transaction(() => {
          for (const row of rows) {
            this.db.query("UPDATE products SET product_summary = json_extract(product_json, '$.summary') WHERE id = ?").run(row.id);
          }
        })();
        this.db.exec("PRAGMA wal_checkpoint(TRUNCATE);");
      }
    }

    this.db.exec("CREATE INDEX IF NOT EXISTS idx_products_list ON products(store_id, product_id, hash, product_summary);");
    this.migrateProductOfferings();
  }

  private backupBeforeProductOfferingMigration(filePath: string): void {
    if (filePath === ":memory:") return;
    const hasLegacy = this.db.query("SELECT 1 FROM sqlite_master WHERE type='table' AND name='products'").get();
    const hasOfferings = this.db.query("SELECT 1 FROM sqlite_master WHERE type='table' AND name='product_offerings'").get();
    if (!hasLegacy || hasOfferings) return;
    const backupPath = `${path.resolve(filePath)}.pre-product-offerings.sqlite`;
    const escaped = backupPath.replaceAll("'", "''");
    try { this.db.exec(`VACUUM INTO '${escaped}'`); } catch {}
  }

  private migrateProductOfferings(): void {
    const hasOfferings = !!this.db.query("SELECT 1 FROM sqlite_master WHERE type='table' AND name='product_offerings'").get();
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS product_offerings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        store_id TEXT NOT NULL,
        external_id TEXT NOT NULL,
        hash TEXT NOT NULL,
        offering_json TEXT NOT NULL,
        offering_summary TEXT,
        title TEXT,
        description TEXT,
        price REAL,
        currency TEXT,
        images_json TEXT NOT NULL DEFAULT '[]',
        url TEXT,
        availability TEXT NOT NULL DEFAULT 'unknown',
        condition TEXT,
        seller_sku TEXT,
        shipping_json TEXT NOT NULL DEFAULT '{}',
        discount_json TEXT NOT NULL DEFAULT '{}',
        warranty_json TEXT NOT NULL DEFAULT '{}',
        metadata_json TEXT NOT NULL DEFAULT '{}',
        synchronization_state_json TEXT NOT NULL DEFAULT '{}',
        enrichment_state TEXT NOT NULL DEFAULT 'pending',
        last_enrichment_run_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(store_id, external_id)
      );
      CREATE TABLE IF NOT EXISTS product_offering_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id TEXT NOT NULL UNIQUE,
        store_id TEXT NOT NULL,
        external_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        run_id TEXT NOT NULL,
        observed_at TEXT NOT NULL,
        event_json TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS product_offering_flags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        store_id TEXT NOT NULL,
        external_id TEXT NOT NULL,
        label TEXT NOT NULL,
        rationale TEXT NOT NULL DEFAULT '',
        confidence REAL,
        created_at TEXT NOT NULL,
        created_by TEXT NOT NULL,
        UNIQUE(store_id, external_id, label)
      );
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parent_id INTEGER REFERENCES categories(id),
        name TEXT NOT NULL,
        normalized_name TEXT NOT NULL,
        normalized_path TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(parent_id, normalized_name)
      );
      CREATE TABLE IF NOT EXISTS canonical_products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        normalized_name TEXT NOT NULL,
        brand TEXT,
        normalized_brand TEXT,
        model TEXT,
        normalized_model TEXT,
        variant_identity_json TEXT NOT NULL DEFAULT '{}',
        category_id INTEGER REFERENCES categories(id),
        metadata_json TEXT NOT NULL DEFAULT '{}',
        review_state TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS product_offering_product_links (
        product_offering_id INTEGER PRIMARY KEY REFERENCES product_offerings(id) ON DELETE CASCADE,
        canonical_product_id INTEGER NOT NULL REFERENCES canonical_products(id),
        confidence REAL NOT NULL,
        review_state TEXT NOT NULL,
        provenance_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS labels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        normalized_name TEXT NOT NULL,
        scope TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        UNIQUE(normalized_name, scope)
      );
      CREATE TABLE IF NOT EXISTS product_labels (
        canonical_product_id INTEGER NOT NULL REFERENCES canonical_products(id) ON DELETE CASCADE,
        label_id INTEGER NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
        provenance_json TEXT NOT NULL DEFAULT '{}',
        PRIMARY KEY(canonical_product_id, label_id)
      );
      CREATE TABLE IF NOT EXISTS product_offering_labels (
        product_offering_id INTEGER NOT NULL REFERENCES product_offerings(id) ON DELETE CASCADE,
        label_id INTEGER NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
        provenance_json TEXT NOT NULL DEFAULT '{}',
        PRIMARY KEY(product_offering_id, label_id)
      );
      CREATE TABLE IF NOT EXISTS product_identifiers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        canonical_product_id INTEGER REFERENCES canonical_products(id) ON DELETE CASCADE,
        product_offering_id INTEGER REFERENCES product_offerings(id) ON DELETE CASCADE,
        identifier_type TEXT NOT NULL,
        value TEXT NOT NULL,
        normalized_value TEXT NOT NULL,
        confidence REAL NOT NULL,
        provenance_json TEXT NOT NULL DEFAULT '{}',
        CHECK ((canonical_product_id IS NULL) != (product_offering_id IS NULL)),
        UNIQUE(identifier_type, normalized_value, canonical_product_id),
        UNIQUE(identifier_type, normalized_value, product_offering_id)
      );
      CREATE TABLE IF NOT EXISTS product_specifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        canonical_product_id INTEGER NOT NULL REFERENCES canonical_products(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        normalized_name TEXT NOT NULL,
        value_json TEXT NOT NULL,
        normalized_value TEXT,
        confidence REAL NOT NULL,
        provenance_json TEXT NOT NULL DEFAULT '{}',
        UNIQUE(canonical_product_id, normalized_name)
      );
      CREATE TABLE IF NOT EXISTS product_offering_specifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_offering_id INTEGER NOT NULL REFERENCES product_offerings(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        normalized_name TEXT NOT NULL,
        value_json TEXT NOT NULL,
        normalized_value TEXT,
        confidence REAL NOT NULL,
        provenance_json TEXT NOT NULL DEFAULT '{}',
        UNIQUE(product_offering_id, normalized_name)
      );
      CREATE TABLE IF NOT EXISTS enrichment_runs (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        harness TEXT,
        model TEXT,
        artifact_path TEXT,
        error TEXT,
        created_at TEXT NOT NULL,
        completed_at TEXT
      );
      CREATE TABLE IF NOT EXISTS enrichment_queue (
        product_offering_id INTEGER PRIMARY KEY REFERENCES product_offerings(id) ON DELETE CASCADE,
        source_hash TEXT NOT NULL,
        reason TEXT NOT NULL,
        state TEXT NOT NULL DEFAULT 'pending',
        attempts INTEGER NOT NULL DEFAULT 0,
        queued_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS applied_enrichment_proposals (
        enrichment_run_id TEXT NOT NULL,
        proposal_table TEXT NOT NULL,
        proposal_id INTEGER NOT NULL,
        applied_at TEXT NOT NULL,
        result_json TEXT NOT NULL DEFAULT '{}',
        PRIMARY KEY(enrichment_run_id, proposal_table, proposal_id)
      );
      CREATE TABLE IF NOT EXISTS product_offering_embeddings (
        product_offering_id INTEGER PRIMARY KEY REFERENCES product_offerings(id) ON DELETE CASCADE,
        source_hash TEXT NOT NULL,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        embedding_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS canonical_product_embeddings (
        canonical_product_id INTEGER PRIMARY KEY REFERENCES canonical_products(id) ON DELETE CASCADE,
        source_hash TEXT NOT NULL,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        embedding_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_product_offerings_store ON product_offerings(store_id, external_id);
      CREATE INDEX IF NOT EXISTS idx_product_offering_events_store ON product_offering_events(store_id, external_id, observed_at);
      CREATE INDEX IF NOT EXISTS idx_product_offering_flags_store ON product_offering_flags(store_id, external_id);
      CREATE INDEX IF NOT EXISTS idx_product_offerings_enrichment ON product_offerings(enrichment_state, updated_at);
      CREATE INDEX IF NOT EXISTS idx_canonical_products_identity ON canonical_products(normalized_brand, normalized_model);
      CREATE INDEX IF NOT EXISTS idx_canonical_products_normalized ON canonical_products(normalized_name, normalized_brand, normalized_model, variant_identity_json);
      CREATE INDEX IF NOT EXISTS idx_product_identifiers_lookup ON product_identifiers(identifier_type, normalized_value);
      CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id, normalized_name);
    CREATE INDEX IF NOT EXISTS idx_enrichment_queue_state ON enrichment_queue(state, queued_at);
    `);
    if (!hasOfferings) {
      this.db.exec(`
        INSERT OR IGNORE INTO product_offerings
          (id, store_id, external_id, hash, offering_json, offering_summary, created_at, updated_at)
        SELECT id, store_id, product_id, hash, product_json, product_summary, created_at, updated_at FROM products;
        INSERT OR IGNORE INTO product_offering_events
          (id, event_id, store_id, external_id, event_type, run_id, observed_at, event_json)
        SELECT id, event_id, store_id, product_id, event_type, run_id, observed_at, event_json FROM product_events;
        INSERT OR IGNORE INTO product_offering_flags
          (id, store_id, external_id, label, rationale, confidence, created_at, created_by)
        SELECT id, source_id, product_id, label, rationale, confidence, created_at, created_by FROM product_flags;
      `);
    }
    for (const statement of [
      "ALTER TABLE product_offerings ADD COLUMN title TEXT",
      "ALTER TABLE product_offerings ADD COLUMN description TEXT",
      "ALTER TABLE product_offerings ADD COLUMN price REAL",
      "ALTER TABLE product_offerings ADD COLUMN currency TEXT",
      "ALTER TABLE product_offerings ADD COLUMN images_json TEXT NOT NULL DEFAULT '[]'",
      "ALTER TABLE product_offerings ADD COLUMN url TEXT",
      "ALTER TABLE product_offerings ADD COLUMN condition TEXT",
      "ALTER TABLE product_offerings ADD COLUMN seller_sku TEXT",
      "ALTER TABLE product_offerings ADD COLUMN shipping_json TEXT NOT NULL DEFAULT '{}'",
      "ALTER TABLE product_offerings ADD COLUMN discount_json TEXT NOT NULL DEFAULT '{}'",
      "ALTER TABLE product_offerings ADD COLUMN warranty_json TEXT NOT NULL DEFAULT '{}'",
      "ALTER TABLE product_offerings ADD COLUMN metadata_json TEXT NOT NULL DEFAULT '{}'",
      "ALTER TABLE product_offerings ADD COLUMN synchronization_state_json TEXT NOT NULL DEFAULT '{}'"
    ]) {
      try { this.db.exec(statement); } catch {}
    }
    if (!hasOfferings) {
      this.db.exec(`
        UPDATE product_offerings SET
          title = COALESCE(title, json_extract(offering_summary, '$.name')),
          price = COALESCE(price, json_extract(offering_summary, '$.price')),
          url = COALESCE(url, json_extract(offering_summary, '$.url')),
          seller_sku = COALESCE(seller_sku, json_extract(offering_summary, '$.sku')),
          images_json = CASE WHEN images_json = '[]' AND json_extract(offering_summary, '$.imageUrl') IS NOT NULL
            THEN json_array(json_extract(offering_summary, '$.imageUrl')) ELSE images_json END
      `);
    }
  }

  addStore(store: StoreConfig): void {
    const now = new Date().toISOString();
    this.db.query(`
      INSERT INTO stores (id, kind, enabled, config_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        kind = excluded.kind,
        enabled = excluded.enabled,
        config_json = excluded.config_json,
        updated_at = excluded.updated_at
    `).run(store.id, store.kind || "ecwid", store.enabled === false ? 0 : 1, JSON.stringify(store), now, now);
  }

  deleteStore(id: string): void {
    this.db.query("DELETE FROM stores WHERE id = ?").run(id);
  }

  getStore(id: string): StoreConfig | null {
    const row = this.db.query("SELECT config_json FROM stores WHERE id = ?").get(id) as { config_json: string } | null;
    return row ? JSON.parse(row.config_json) : null;
  }

  listStores(): StoreConfig[] {
    const rows = this.db.query("SELECT config_json FROM stores").all() as { config_json: string }[];
    return rows.map(r => JSON.parse(r.config_json));
  }

  upsertProduct(storeId: string, productId: string, hash: string, product: JsonObject): void {
    this.upsertProductOffering(storeId, productId, hash, product);
  }

  upsertProductOffering(storeId: string, externalId: string, hash: string, offering: JsonObject): void {
    const now = new Date().toISOString();
    const value = offering as any;
    const summaryValue = value.summary ?? {};
    const productValue = value.product ?? {};
    const summary = value.summary ? JSON.stringify(value.summary) : null;
    const images = [...new Set([summaryValue.imageUrl, ...(productValue.imageUrls ?? []), ...(productValue.images ?? [])].filter((item) => typeof item === "string"))];
    const discount = productValue.discount ?? (summaryValue.compareToPrice ? { compareAtPrice: summaryValue.compareToPrice } : {});

    // Safe extraction of parameters to avoid raw API objects leaking into SQLite bindings:
    const title = typeof summaryValue.name === "string" ? summaryValue.name : (productValue.title && typeof productValue.title === "string" ? productValue.title : (productValue.name && typeof productValue.name === "string" ? productValue.name : null));
    
    const description = typeof productValue.offering?.description === "string" 
      ? productValue.offering.description 
      : (typeof productValue.description === "string" ? productValue.description : null);

    const price = typeof summaryValue.price === "number"
      ? summaryValue.price
      : (typeof productValue.price === "number" ? productValue.price : null);

    const currency = typeof productValue.offering?.currency === "string"
      ? productValue.offering.currency
      : (typeof productValue.currency === "string" ? productValue.currency : null);

    const url = typeof summaryValue.url === "string"
      ? summaryValue.url
      : (typeof productValue.url === "string" ? productValue.url : null);

    const rawAvailability = typeof productValue.offering?.availability === "string"
      ? productValue.offering.availability
      : (typeof productValue.availability === "string" ? productValue.availability : "unknown");
    const availability = (summaryValue.inStock === false || rawAvailability === "unavailable")
      ? "unavailable"
      : rawAvailability;

    let condition: string | null = null;
    if (typeof productValue.offering?.condition === "string") {
      condition = productValue.offering.condition;
    } else if (typeof productValue.condition === "string") {
      condition = productValue.condition;
    } else if (productValue.condition && typeof productValue.condition === "object" && typeof productValue.condition.value === "string") {
      condition = productValue.condition.value;
    } else if (productValue.attributes && typeof productValue.attributes === "object" && typeof productValue.attributes.condition === "string") {
      condition = productValue.attributes.condition;
    }

    const rawSku = summaryValue.sku ?? productValue.offering?.attributes?.sku ?? productValue.attributes?.sku ?? productValue.sku;
    const sellerSku = (typeof rawSku === "string" || typeof rawSku === "number") ? String(rawSku) : null;

    this.db.query(`
      INSERT INTO product_offerings
        (store_id, external_id, hash, offering_json, offering_summary, title, description, price, currency, images_json, url,
         availability, condition, seller_sku, shipping_json, discount_json, warranty_json, metadata_json, synchronization_state_json,
         enrichment_state, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(store_id, external_id) DO UPDATE SET
        hash = excluded.hash,
        offering_json = excluded.offering_json,
        offering_summary = excluded.offering_summary,
        title = excluded.title, description = excluded.description, price = excluded.price, currency = excluded.currency,
        images_json = excluded.images_json, url = excluded.url, availability = excluded.availability, condition = excluded.condition,
        seller_sku = excluded.seller_sku, shipping_json = excluded.shipping_json, discount_json = excluded.discount_json,
        warranty_json = excluded.warranty_json, metadata_json = excluded.metadata_json,
        synchronization_state_json = excluded.synchronization_state_json,
        enrichment_state = CASE WHEN product_offerings.hash <> excluded.hash THEN 'pending' ELSE product_offerings.enrichment_state END,
        updated_at = excluded.updated_at
    `).run(
      storeId, externalId, hash, JSON.stringify(offering), summary, title,
      description, price, currency, JSON.stringify(images),
      url, availability,
      condition, sellerSku, JSON.stringify(productValue.shipping ?? {}),
      JSON.stringify(discount), JSON.stringify(productValue.warranty ?? {}), JSON.stringify(productValue.metadata ?? {}),
      JSON.stringify({ sourceHash: hash, synchronizedAt: now }), "pending", now, now
    );
    const row = this.db.query("SELECT id FROM product_offerings WHERE store_id = ? AND external_id = ?").get(storeId, externalId) as { id: number };
    this.queueProductOffering(row.id, hash, "synchronized");
  }

  deleteProduct(storeId: string, productId: string): void {
    this.db.query("UPDATE product_offerings SET availability = 'unavailable', updated_at = ? WHERE store_id = ? AND external_id = ?")
      .run(new Date().toISOString(), storeId, productId);
  }

  getProduct(storeId: string, productId: string): { hash: string; product: JsonObject } | null {
    const row = this.db.query("SELECT hash, offering_json product_json FROM product_offerings WHERE store_id = ? AND external_id = ?").get(storeId, productId) as { hash: string; product_json: string } | null;
    if (!row) return null;
    return { hash: row.hash, product: JSON.parse(row.product_json) };
  }

  listProducts(): { storeId: string; productId: string; hash: string; product: JsonObject }[] {
    const rows = this.db.query("SELECT store_id, external_id product_id, hash, offering_summary product_summary FROM product_offerings WHERE availability <> 'unavailable'").all() as { store_id: string; product_id: string; hash: string; product_summary: string }[];
    return rows.map((row) => ({
      storeId: row.store_id,
      productId: row.product_id,
      hash: row.hash,
      product: row.product_summary ? JSON.parse(row.product_summary) : {}
    }));
  }

  listStoreProducts(storeId: string): { productId: string; hash: string; product: JsonObject }[] {
    const rows = this.db.query("SELECT external_id product_id, hash, offering_summary product_summary FROM product_offerings WHERE store_id = ? AND availability <> 'unavailable'").all(storeId) as { product_id: string; hash: string; product_summary: string }[];
    return rows.map((row) => ({
      productId: row.product_id,
      hash: row.hash,
      product: row.product_summary ? JSON.parse(row.product_summary) : {}
    }));
  }

  listProductOfferings() {
    const links = new Map((this.db.query("SELECT product_offering_id, canonical_product_id, confidence, review_state FROM product_offering_product_links").all() as any[])
      .map((row) => [Number(row.product_offering_id), row]));
    const rows = this.db.query("SELECT id, store_id, external_id, hash, offering_summary FROM product_offerings WHERE availability <> 'unavailable'").all() as any[];
    return rows.map((row) => ({
      id: Number(row.id), storeId: row.store_id, externalId: row.external_id, productId: row.external_id, hash: row.hash,
      product: row.offering_summary ? JSON.parse(row.offering_summary) : {},
      canonicalProductId: links.get(Number(row.id))?.canonical_product_id ?? null,
      canonicalMatchConfidence: links.get(Number(row.id))?.confidence ?? null,
      canonicalMatchReviewState: links.get(Number(row.id))?.review_state ?? null
    }));
  }

  searchProductOfferings(params: {
    storeFilter?: string[];
    favorites?: string[]; 
    activeListKeys?: string[];
    showHidden?: boolean;
    sortKey?: string;
    offset?: number;
    limit?: number;
  }, sqlCondition?: { sql: string; params: unknown[] }) {
    let sql = "SELECT o.id, o.store_id, o.external_id, o.hash, o.offering_summary, l.canonical_product_id, l.confidence, l.review_state FROM product_offerings o LEFT JOIN product_offering_product_links l ON l.product_offering_id = o.id WHERE ";
    let countSql = "SELECT COUNT(*) as count FROM product_offerings o WHERE ";
    
    const conditions: string[] = [];
    const queryParams: unknown[] = [];
    
    if (!params.showHidden) {
      conditions.push("o.availability <> 'unavailable'");
      conditions.push("COALESCE(json_extract(o.offering_summary, '$.enabled'), json_extract(o.offering_summary, '$.summary.enabled'), 1) IS NOT 0");
    }

    if (params.storeFilter && params.storeFilter.length > 0) {
      conditions.push(`o.store_id IN (${params.storeFilter.map(() => "?").join(",")})`);
      queryParams.push(...params.storeFilter);
    }
    
    if (params.activeListKeys && params.activeListKeys.length > 0) {
      conditions.push(`(o.store_id || ':' || o.external_id) IN (${params.activeListKeys.map(() => "?").join(",")})`);
      queryParams.push(...params.activeListKeys);
    }

    if (sqlCondition && sqlCondition.sql !== "1=1") {
      conditions.push(`(${sqlCondition.sql})`);
      queryParams.push(...sqlCondition.params);
    }
    
    const whereClause = conditions.length > 0 ? conditions.join(" AND ") : "1=1";
    sql += whereClause;
    countSql += whereClause;

    const countParams = [...queryParams];
    let orderBy = "";

    if (params.sortKey === "price") {
      orderBy = "ORDER BY CAST(COALESCE(json_extract(o.offering_summary, '$.summary.price'), json_extract(o.offering_summary, '$.price'), json_extract(o.offering_summary, '$.summary.defaultDisplayedPrice'), json_extract(o.offering_summary, '$.defaultDisplayedPrice')) AS REAL) ASC";
    } else if (params.sortKey === "stock") {
      orderBy = "ORDER BY CAST(COALESCE(json_extract(o.offering_summary, '$.summary.quantity'), json_extract(o.offering_summary, '$.quantity')) AS INTEGER) ASC";
    } else if (params.sortKey === "store") {
      orderBy = "ORDER BY o.store_id ASC";
    } else if (params.sortKey === "category") {
      orderBy = "ORDER BY COALESCE(json_extract(o.offering_summary, '$.summary.categoryNames[0]'), json_extract(o.offering_summary, '$.categoryNames[0]')) ASC";
    } else if (params.sortKey === "favorite" && params.favorites && params.favorites.length > 0) {
      orderBy = `ORDER BY CASE WHEN (o.store_id || ':' || o.external_id) IN (${params.favorites.map(() => "?").join(",")}) THEN 0 ELSE 1 END ASC`;
      queryParams.push(...params.favorites);
    } else {
      orderBy = "ORDER BY COALESCE(json_extract(o.offering_summary, '$.summary.name'), json_extract(o.offering_summary, '$.name')) ASC, o.store_id ASC";
    }
    
    if (orderBy) {
      sql += ` ${orderBy}`;
    }
    
    const limit = params.limit || 50;
    const offset = params.offset || 0;
    sql += ` LIMIT ? OFFSET ?`;
    
    queryParams.push(limit, offset);
    
    const totalCount = (this.db.query(countSql).get(...countParams) as any).count;
    const rows = this.db.query(sql).all(...queryParams) as any[];

    const products = rows.map((row) => ({
      id: Number(row.id), storeId: row.store_id, externalId: row.external_id, productId: row.external_id, hash: row.hash,
      product: row.offering_summary ? JSON.parse(row.offering_summary) : {},
      canonicalProductId: row.canonical_product_id ?? null,
      canonicalMatchConfidence: row.confidence ?? null,
      canonicalMatchReviewState: row.review_state ?? null
    }));
    
    return { total: totalCount, products };
  }

  listCanonicalProducts(): Record<string, unknown>[] {
    return this.db.query(`
      SELECT p.*, c.normalized_path category_path, COUNT(l.product_offering_id) offering_count
      FROM canonical_products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN product_offering_product_links l ON l.canonical_product_id = p.id AND l.review_state = 'accepted'
      GROUP BY p.id ORDER BY p.id
    `).all() as Record<string, unknown>[];
  }

  productOfferingDetails(id: number): Record<string, unknown> | null {
    const offering = this.db.query(`
      SELECT o.*, l.canonical_product_id, l.confidence canonical_match_confidence, l.review_state canonical_match_review_state
      FROM product_offerings o LEFT JOIN product_offering_product_links l ON l.product_offering_id = o.id WHERE o.id = ?
    `).get(id) as Record<string, unknown> | null;
    if (!offering) return null;
    return {
      ...offering,
      offering: JSON.parse(String(offering.offering_json)),
      labels: this.db.query("SELECT labels.* FROM labels JOIN product_offering_labels l ON l.label_id = labels.id WHERE l.product_offering_id = ? ORDER BY labels.name").all(id),
      specifications: this.db.query("SELECT * FROM product_offering_specifications WHERE product_offering_id = ? ORDER BY normalized_name").all(id)
    };
  }

  canonicalProductDetails(id: number): Record<string, unknown> | null {
    const product = this.db.query(`
      SELECT p.*, c.normalized_path category_path FROM canonical_products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?
    `).get(id) as Record<string, unknown> | null;
    if (!product) return null;
    return {
      ...product,
      variantIdentity: JSON.parse(String(product.variant_identity_json)),
      metadata: JSON.parse(String(product.metadata_json)),
      labels: this.db.query("SELECT labels.* FROM labels JOIN product_labels l ON l.label_id = labels.id WHERE l.canonical_product_id = ? ORDER BY labels.name").all(id),
      specifications: this.db.query("SELECT * FROM product_specifications WHERE canonical_product_id = ? ORDER BY normalized_name").all(id),
      identifiers: this.db.query("SELECT * FROM product_identifiers WHERE canonical_product_id = ? ORDER BY identifier_type").all(id),
      offerings: this.db.query(`
        SELECT o.id, o.store_id, o.external_id, o.hash, o.offering_summary, l.confidence, l.review_state
        FROM product_offering_product_links l JOIN product_offerings o ON o.id = l.product_offering_id
        WHERE l.canonical_product_id = ? AND l.review_state = 'accepted' ORDER BY o.store_id, o.external_id
      `).all(id).map((row: any) => ({ ...row, offering_summary: row.offering_summary ? JSON.parse(row.offering_summary) : {} }))
    };
  }

  createEnrichmentRun(input: { id: string; harness?: string; model?: string; artifactPath: string }): void {
    this.db.query(`
      INSERT INTO enrichment_runs (id, status, harness, model, artifact_path, created_at)
      VALUES (?, 'prepared', ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET harness=excluded.harness, model=excluded.model, artifact_path=excluded.artifact_path
    `).run(input.id, input.harness ?? null, input.model ?? null, input.artifactPath, new Date().toISOString());
  }

  listEnrichmentRuns(): Record<string, unknown>[] {
    return this.db.query("SELECT * FROM enrichment_runs ORDER BY created_at DESC").all() as Record<string, unknown>[];
  }

  deleteEnrichmentRun(id: string): string | null {
    const row = this.db.query("SELECT artifact_path FROM enrichment_runs WHERE id = ?").get(id) as { artifact_path: string | null } | null;
    if (!row) return null;
    this.db.query("DELETE FROM enrichment_runs WHERE id = ?").run(id);
    return row.artifact_path;
  }

  setEnrichmentRunStatus(id: string, status: string, error?: string): void {
    this.db.query("UPDATE enrichment_runs SET status = ?, error = ?, completed_at = CASE WHEN ? IN ('completed','failed','invalid') THEN ? ELSE completed_at END WHERE id = ?")
      .run(status, error ?? null, status, new Date().toISOString(), id);
  }

  hasAppliedEnrichmentProposal(runId: string, table: string, proposalId: number): boolean {
    return !!this.db.query("SELECT 1 FROM applied_enrichment_proposals WHERE enrichment_run_id = ? AND proposal_table = ? AND proposal_id = ?").get(runId, table, proposalId);
  }

  markEnrichmentProposalApplied(runId: string, table: string, proposalId: number, result: unknown = {}): void {
    this.db.query("INSERT OR IGNORE INTO applied_enrichment_proposals VALUES (?, ?, ?, ?, ?)")
      .run(runId, table, proposalId, new Date().toISOString(), JSON.stringify(result));
  }

  assignCategory(input: { scope: "Product" | "ProductOffering"; targetId: number; categoryId: number }): void {
    if (input.scope === "Product") {
      this.db.query("UPDATE canonical_products SET category_id = ?, updated_at = ? WHERE id = ?").run(input.categoryId, new Date().toISOString(), input.targetId);
      return;
    }
    this.addSpecification({ scope: "ProductOffering", targetId: input.targetId, name: "staged_category_id", value: input.categoryId, normalizedValue: String(input.categoryId), confidence: 1 });
  }

  upsertEmbedding(input: { scope: "Product" | "ProductOffering"; targetId: number; sourceHash: string; provider: string; model: string; embedding: number[] }): void {
    const table = input.scope === "Product" ? "canonical_product_embeddings" : "product_offering_embeddings";
    const target = input.scope === "Product" ? "canonical_product_id" : "product_offering_id";
    this.db.query(`INSERT INTO ${table} (${target}, source_hash, provider, model, embedding_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(${target}) DO UPDATE SET source_hash=excluded.source_hash, provider=excluded.provider, model=excluded.model,
        embedding_json=excluded.embedding_json, updated_at=excluded.updated_at`)
      .run(input.targetId, input.sourceHash, input.provider, input.model, JSON.stringify(input.embedding), new Date().toISOString());
  }

  acceptCanonicalMatch(input: { runId: string; productOfferingId: number; canonicalProductId: number; confidence: number; evidence: unknown; agentMetadata: unknown }): void {
    this.db.transaction(() => {
      this.linkProductOffering({
        productOfferingId: input.productOfferingId,
        canonicalProductId: input.canonicalProductId,
        confidence: input.confidence,
        reviewState: "accepted",
        provenance: { enrichmentRunId: input.runId, evidence: input.evidence, agent: input.agentMetadata }
      });
      this.db.query("UPDATE product_offerings SET enrichment_state = 'enriched', last_enrichment_run_id = ? WHERE id = ?").run(input.runId, input.productOfferingId);
      this.db.query("UPDATE enrichment_queue SET state = 'completed', updated_at = ? WHERE product_offering_id = ?").run(new Date().toISOString(), input.productOfferingId);
    })();
  }

  createCanonicalProduct(input: { name: string; brand?: string; model?: string; variantIdentity?: JsonObject; categoryId?: number; reviewState?: string }): number {
    const normalize = (value?: string) => value?.trim().toLowerCase().replace(/\s+/g, " ") || null;
    const now = new Date().toISOString();
    const variantIdentity = JSON.stringify(input.variantIdentity ?? {});
    const existing = this.db.query(`
      SELECT id FROM canonical_products
      WHERE normalized_name = ? AND normalized_brand IS ? AND normalized_model IS ? AND variant_identity_json = ?
      LIMIT 1
    `).get(normalize(input.name), normalize(input.brand), normalize(input.model), variantIdentity) as { id: number } | null;
    if (existing) return Number(existing.id);
    const result = this.db.query(`
      INSERT INTO canonical_products
        (name, normalized_name, brand, normalized_brand, model, normalized_model, variant_identity_json, category_id, review_state, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(input.name.trim(), normalize(input.name), input.brand ?? null, normalize(input.brand), input.model ?? null, normalize(input.model),
      variantIdentity, input.categoryId ?? null, input.reviewState ?? "pending", now, now);
    return Number(result.lastInsertRowid);
  }

  linkProductOffering(input: { productOfferingId: number; canonicalProductId: number; confidence: number; reviewState?: string; provenance?: unknown }): void {
    if (input.confidence < 0 || input.confidence > 1) throw new Error("confidence must be between 0 and 1");
    const now = new Date().toISOString();
    this.db.query(`
      INSERT INTO product_offering_product_links
        (product_offering_id, canonical_product_id, confidence, review_state, provenance_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(product_offering_id) DO UPDATE SET canonical_product_id=excluded.canonical_product_id,
        confidence=excluded.confidence, review_state=excluded.review_state, provenance_json=excluded.provenance_json, updated_at=excluded.updated_at
    `).run(input.productOfferingId, input.canonicalProductId, input.confidence, input.reviewState ?? "pending", JSON.stringify(input.provenance ?? {}), now, now);
  }

  addProductIdentifier(input: { canonicalProductId?: number; productOfferingId?: number; type: string; value: string; confidence: number; provenance?: unknown }): void {
    const type = input.type.trim().toLowerCase();
    if (input.canonicalProductId && ["sku", "seller_sku", "store_sku"].includes(type)) throw new Error("store-specific SKUs cannot identify canonical products");
    if (!!input.canonicalProductId === !!input.productOfferingId) throw new Error("identifier must target exactly one entity");
    this.db.query(`
      INSERT OR IGNORE INTO product_identifiers
        (canonical_product_id, product_offering_id, identifier_type, value, normalized_value, confidence, provenance_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(input.canonicalProductId ?? null, input.productOfferingId ?? null, type, input.value, input.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, ""), input.confidence, JSON.stringify(input.provenance ?? {}));
  }

  createOrReuseLabel(input: { name: string; scope: string; description?: string }): number {
    const normalized = input.name.trim().toLowerCase().replace(/\s+/g, " ");
    this.db.query("INSERT OR IGNORE INTO labels (name, normalized_name, scope, description, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(input.name.trim(), normalized, input.scope, input.description ?? "", new Date().toISOString());
    return Number((this.db.query("SELECT id FROM labels WHERE normalized_name = ? AND scope = ?").get(normalized, input.scope) as { id: number }).id);
  }

  createOrReuseCategory(input: { name: string; fullPath: string; parentId?: number; description?: string }): number {
    const parts = input.fullPath.split(">").map((part) => part.trim()).filter(Boolean);
    if (!parts.length) throw new Error("category path must contain at least one segment");
    let parentId = input.parentId ?? null;
    let currentId = 0;
    const now = new Date().toISOString();
    const pathParts: string[] = [];
    for (const part of parts) {
      pathParts.push(part);
      const normalizedName = part.toLowerCase().replace(/\s+/g, " ");
      const normalizedPath = pathParts.map((item) => item.toLowerCase().replace(/\s+/g, " ")).join(" > ");
      this.db.query("INSERT OR IGNORE INTO categories (parent_id, name, normalized_name, normalized_path, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run(parentId, part, normalizedName, normalizedPath, pathParts.length === parts.length ? input.description ?? "" : "", now, now);
      currentId = Number((this.db.query("SELECT id FROM categories WHERE normalized_path = ?").get(normalizedPath) as { id: number }).id);
      parentId = currentId;
    }
    return currentId;
  }

  addSpecification(input: { scope: "Product" | "ProductOffering"; targetId: number; name: string; value: unknown; normalizedValue?: string; confidence: number; provenance?: unknown }): void {
    const normalizedName = input.name.trim().toLowerCase().replace(/\s+/g, "_");
    const table = input.scope === "Product" ? "product_specifications" : "product_offering_specifications";
    const target = input.scope === "Product" ? "canonical_product_id" : "product_offering_id";
    this.db.query(`INSERT INTO ${table} (${target}, name, normalized_name, value_json, normalized_value, confidence, provenance_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(${target}, normalized_name) DO UPDATE SET value_json=excluded.value_json, normalized_value=excluded.normalized_value,
        confidence=excluded.confidence, provenance_json=excluded.provenance_json`)
      .run(input.targetId, input.name, normalizedName, JSON.stringify(input.value), input.normalizedValue ?? null, input.confidence, JSON.stringify(input.provenance ?? {}));
  }

  attachLabel(input: { scope: "Product" | "ProductOffering"; targetId: number; labelId: number; provenance?: unknown }): void {
    const table = input.scope === "Product" ? "product_labels" : "product_offering_labels";
    const target = input.scope === "Product" ? "canonical_product_id" : "product_offering_id";
    this.db.query(`INSERT OR REPLACE INTO ${table} (${target}, label_id, provenance_json) VALUES (?, ?, ?)`)
      .run(input.targetId, input.labelId, JSON.stringify(input.provenance ?? {}));
  }

  listPendingEnrichmentOfferings(): Record<string, unknown>[] {
    return this.db.query(`
      SELECT q.product_offering_id id, o.store_id, o.external_id, o.hash, o.offering_json, q.reason, q.queued_at
      FROM enrichment_queue q JOIN product_offerings o ON o.id = q.product_offering_id
      WHERE q.state = 'pending' ORDER BY q.queued_at
    `).all() as Record<string, unknown>[];
  }

  queueProductOffering(id: number, hash: string, reason: string): void {
    const now = new Date().toISOString();
    this.db.query(`
      INSERT INTO enrichment_queue (product_offering_id, source_hash, reason, queued_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(product_offering_id) DO UPDATE SET
        source_hash = excluded.source_hash, reason = excluded.reason,
        state = CASE WHEN enrichment_queue.source_hash <> excluded.source_hash THEN 'pending' ELSE enrichment_queue.state END,
        updated_at = excluded.updated_at
    `).run(id, hash, reason, now, now);
  }

  insertEvents(events: ProductEvent[]): void {
    if (events.length === 0) return;
    const stmt = this.db.query(`
      INSERT INTO product_offering_events (event_id, store_id, external_id, event_type, run_id, observed_at, event_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(event_id) DO NOTHING
    `);
    const transaction = this.db.transaction((evs: ProductEvent[]) => {
      for (const event of evs) {
        stmt.run(event.eventId, event.storeId, event.productId, event.eventType, event.runId, event.observedAt, JSON.stringify(event));
      }
    });
    transaction(events);
  }

  listEvents(storeId?: string, limit = 500): ProductEvent[] {
    const rows = storeId 
      ? this.db.query("SELECT event_json FROM product_offering_events WHERE store_id = ? ORDER BY id DESC LIMIT ?").all(storeId, limit) as { event_json: string }[]
      : this.db.query("SELECT event_json FROM product_offering_events ORDER BY id DESC LIMIT ?").all(limit) as { event_json: string }[];
    return rows.map(r => JSON.parse(r.event_json));
  }

  addFlag(input: Omit<ProductFlag, "id" | "createdAt">): ProductFlag {
    const createdAt = new Date().toISOString();
    this.db.query(`
      INSERT INTO product_offering_flags (store_id, external_id, label, rationale, confidence, created_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(store_id, external_id, label) DO UPDATE SET
        rationale = excluded.rationale,
        confidence = excluded.confidence,
        created_at = excluded.created_at,
        created_by = excluded.created_by
    `).run(input.sourceId, input.productId, input.label, input.rationale, input.confidence, createdAt, input.createdBy);
    return this.mapFlag(this.db.query("SELECT id, store_id source_id, external_id product_id, label, rationale, confidence, created_at, created_by FROM product_offering_flags WHERE store_id = ? AND external_id = ? AND label = ?")
      .get(input.sourceId, input.productId, input.label) as Record<string, unknown>);
  }

  listFlags(sourceId?: string, productId?: string): ProductFlag[] {
    const rows = sourceId && productId
      ? this.db.query("SELECT id, store_id source_id, external_id product_id, label, rationale, confidence, created_at, created_by FROM product_offering_flags WHERE store_id = ? AND external_id = ? ORDER BY created_at DESC").all(sourceId, productId)
      : sourceId
        ? this.db.query("SELECT id, store_id source_id, external_id product_id, label, rationale, confidence, created_at, created_by FROM product_offering_flags WHERE store_id = ? ORDER BY created_at DESC").all(sourceId)
        : this.db.query("SELECT id, store_id source_id, external_id product_id, label, rationale, confidence, created_at, created_by FROM product_offering_flags ORDER BY created_at DESC").all();
    return (rows as Record<string, unknown>[]).map((row) => this.mapFlag(row));
  }

  removeFlag(sourceId: string, productId: string, label: string): { sourceId: string; productId: string; label: string; removed: boolean } {
    const result = this.db.query("DELETE FROM product_offering_flags WHERE store_id = ? AND external_id = ? AND label = ?").run(sourceId, productId, label);
    return { sourceId, productId, label, removed: result.changes > 0 };
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

  listConversations(archived = false): Conversation[] {
    const sql = archived
      ? "SELECT * FROM conversations WHERE archived_at IS NOT NULL ORDER BY updated_at DESC"
      : "SELECT * FROM conversations WHERE archived_at IS NULL ORDER BY updated_at DESC";
    return (this.db.query(sql).all() as Record<string, unknown>[]).map((row) => this.mapConversation(row));
  }

  renameConversation(id: number, title: string, source: Conversation["titleSource"] = "manual"): Conversation | null {
    this.db.query("UPDATE conversations SET title = ?, title_source = ?, updated_at = ? WHERE id = ?").run(title.trim(), source, new Date().toISOString(), id);
    return this.conversation(id);
  }

  archiveConversation(id: number, archived: boolean): Conversation | null {
    this.db.query("UPDATE conversations SET archived_at = ?, updated_at = ? WHERE id = ?").run(archived ? new Date().toISOString() : null, new Date().toISOString(), id);
    return this.conversation(id);
  }

  deleteConversation(id: number): boolean {
    return this.db.query("DELETE FROM conversations WHERE id = ?").run(id).changes > 0;
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

  updateMessageContent(id: number, content: string, metadata?: unknown): ConversationMessage | null {
    if (metadata === undefined) this.db.query("UPDATE conversation_messages SET content = ? WHERE id = ?").run(content, id);
    else this.db.query("UPDATE conversation_messages SET content = ?, metadata_json = ? WHERE id = ?").run(content, JSON.stringify(metadata), id);
    const row = this.db.query("SELECT * FROM conversation_messages WHERE id = ?").get(id) as Record<string, unknown> | null;
    return row ? {
      id: Number(row.id), conversationId: Number(row.conversation_id), role: row.role as ConversationMessage["role"],
      content: String(row.content), metadata: JSON.parse(String(row.metadata_json)), createdAt: String(row.created_at)
    } : null;
  }

  createAssistantRun(input: { conversationId: number; userMessageId: number; assistantMessageId: number; providerId: number | null; model: string }): AssistantRun {
    const createdAt = new Date().toISOString();
    const result = this.db.query(`
      INSERT INTO assistant_runs (conversation_id, user_message_id, assistant_message_id, provider_id, model, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'queued', ?)
    `).run(input.conversationId, input.userMessageId, input.assistantMessageId, input.providerId, input.model, createdAt);
    return this.assistantRun(Number(result.lastInsertRowid))!;
  }

  assistantRun(id: number): AssistantRun | null {
    const row = this.db.query("SELECT * FROM assistant_runs WHERE id = ?").get(id) as Record<string, unknown> | null;
    return row ? this.mapAssistantRun(row) : null;
  }

  listAssistantRuns(conversationId: number): AssistantRun[] {
    return (this.db.query("SELECT * FROM assistant_runs WHERE conversation_id = ? ORDER BY id DESC").all(conversationId) as Record<string, unknown>[]).map((row) => this.mapAssistantRun(row));
  }

  setAssistantRunRunning(id: number): AssistantRun | null {
    this.db.query("UPDATE assistant_runs SET status = 'running', started_at = ? WHERE id = ?").run(new Date().toISOString(), id);
    return this.assistantRun(id);
  }

  finishAssistantRun(id: number, status: Extract<AssistantRunStatus, "completed" | "failed" | "cancelled">, error?: string): AssistantRun | null {
    this.db.query("UPDATE assistant_runs SET status = ?, error = ?, completed_at = ? WHERE id = ?").run(status, error ?? null, new Date().toISOString(), id);
    return this.assistantRun(id);
  }

  requestAssistantRunCancellation(id: number): boolean {
    return this.db.query("UPDATE assistant_runs SET cancel_requested = 1 WHERE id = ? AND status IN ('queued', 'running')").run(id).changes > 0;
  }

  markInterruptedAssistantRuns(): number {
    return this.db.query("UPDATE assistant_runs SET status = 'failed', error = ?, completed_at = ? WHERE status IN ('queued', 'running')")
      .run("Server restarted while response was generating", new Date().toISOString()).changes;
  }

  addAssistantRunEvent(runId: number, conversationId: number, event: string, data: unknown): AssistantRunEvent {
    const createdAt = new Date().toISOString();
    const result = this.db.query("INSERT INTO assistant_run_events (run_id, conversation_id, event, data_json, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(runId, conversationId, event, JSON.stringify(data), createdAt);
    return { id: Number(result.lastInsertRowid), runId, conversationId, event, data, createdAt };
  }

  listAssistantRunEvents(conversationId: number, afterId = 0): AssistantRunEvent[] {
    return (this.db.query("SELECT * FROM assistant_run_events WHERE conversation_id = ? AND id > ? ORDER BY id").all(conversationId, afterId) as Record<string, unknown>[]).map((row) => ({
      id: Number(row.id), runId: Number(row.run_id), conversationId: Number(row.conversation_id), event: String(row.event),
      data: JSON.parse(String(row.data_json)), createdAt: String(row.created_at)
    }));
  }

  getSetting<T>(key: string): T | undefined {
    const row = this.db.query("SELECT value_json FROM app_settings WHERE key = ?").get(key) as { value_json?: string } | null;
    return row?.value_json ? JSON.parse(row.value_json) as T : undefined;
  }

  setSetting(key: string, value: unknown): void {
    this.db.query(`
      INSERT INTO app_settings (key, value_json, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at
    `).run(key, JSON.stringify(value), new Date().toISOString());
  }

  createSavedSearch(input: { name: string; query: string; sourceIds: string[]; watched?: boolean; enabled?: boolean; intervalMinutes?: number }): SavedSearch {
    const now = new Date().toISOString();
    const watched = input.watched === true;
    const interval = Math.max(1, Math.floor(input.intervalMinutes ?? 30));
    const result = this.db.query(`
      INSERT INTO saved_searches (name, query, source_ids_json, watched, enabled, interval_minutes, next_run_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(input.name, input.query, JSON.stringify(input.sourceIds), watched ? 1 : 0, input.enabled === false ? 0 : 1, interval,
      watched && input.enabled !== false ? now : null, now, now);
    return this.savedSearch(Number(result.lastInsertRowid))!;
  }

  updateSavedSearch(id: number, input: { name: string; query: string; sourceIds: string[]; watched?: boolean; enabled?: boolean; intervalMinutes?: number }): SavedSearch | null {
    const previous = this.savedSearch(id);
    if (!previous) return null;
    const now = new Date().toISOString();
    const watched = input.watched === true;
    const enabled = input.enabled !== false;
    const definitionChanged = previous.query !== input.query || JSON.stringify(previous.sourceIds) !== JSON.stringify(input.sourceIds);
    if (definitionChanged) this.db.query("DELETE FROM saved_search_results WHERE search_id = ?").run(id);
    this.db.query(`
      UPDATE saved_searches SET name = ?, query = ?, source_ids_json = ?, watched = ?, enabled = ?, interval_minutes = ?,
        next_run_at = ?, updated_at = ? WHERE id = ?
    `).run(input.name, input.query, JSON.stringify(input.sourceIds), watched ? 1 : 0, enabled ? 1 : 0,
      Math.max(1, Math.floor(input.intervalMinutes ?? 30)), watched && enabled ? now : null, now, id);
    return this.savedSearch(id);
  }

  deleteSavedSearch(id: number): boolean {
    return this.db.query("DELETE FROM saved_searches WHERE id = ?").run(id).changes > 0;
  }

  savedSearch(id: number): SavedSearch | null {
    const row = this.db.query("SELECT * FROM saved_searches WHERE id = ?").get(id) as Record<string, unknown> | null;
    return row ? this.mapSavedSearch(row) : null;
  }

  listSavedSearches(): SavedSearch[] {
    return (this.db.query("SELECT * FROM saved_searches ORDER BY id DESC").all() as Record<string, unknown>[]).map((row) => this.mapSavedSearch(row));
  }

  listDueSavedSearches(now = new Date()): SavedSearch[] {
    return (this.db.query(`
      SELECT * FROM saved_searches
      WHERE watched = 1 AND enabled = 1 AND (next_run_at IS NULL OR next_run_at <= ?)
      ORDER BY id
    `).all(now.toISOString()) as Record<string, unknown>[]).map((row) => this.mapSavedSearch(row));
  }

  recordSavedSearchRun(input: { searchId: number; status: string; resultCount: number; sourceResults: unknown; startedAt: string; completedAt: string }): SavedSearchRun {
    const result = this.db.query(`
      INSERT INTO saved_search_runs (search_id, status, result_count, source_results_json, started_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(input.searchId, input.status, input.resultCount, JSON.stringify(input.sourceResults), input.startedAt, input.completedAt);
    const search = this.savedSearch(input.searchId);
    const nextRunAt = search?.watched && search.enabled
      ? new Date(new Date(input.completedAt).getTime() + search.intervalMinutes * 60_000).toISOString()
      : null;
    this.db.query("UPDATE saved_searches SET last_run_at = ?, last_run_status = ?, next_run_at = ?, updated_at = ? WHERE id = ?")
      .run(input.completedAt, input.status, nextRunAt, input.completedAt, input.searchId);
    return this.listSavedSearchRuns(input.searchId, 1)[0]!;
  }

  listSavedSearchRuns(searchId: number, limit = 100): SavedSearchRun[] {
    return (this.db.query("SELECT * FROM saved_search_runs WHERE search_id = ? ORDER BY id DESC LIMIT ?").all(searchId, limit) as Record<string, unknown>[]).map((row) => ({
      id: Number(row.id), searchId: Number(row.search_id), status: String(row.status), resultCount: Number(row.result_count),
      sourceResults: JSON.parse(String(row.source_results_json)), startedAt: String(row.started_at), completedAt: String(row.completed_at)
    }));
  }

  listSavedSearchResults(searchId: number, sourceId?: string): SavedSearchResult[] {
    const rows = sourceId
      ? this.db.query("SELECT * FROM saved_search_results WHERE search_id = ? AND source_id = ? ORDER BY product_id").all(searchId, sourceId)
      : this.db.query("SELECT * FROM saved_search_results WHERE search_id = ? ORDER BY source_id, product_id").all(searchId);
    return (rows as Record<string, unknown>[]).map((row) => ({
      searchId: Number(row.search_id), sourceId: String(row.source_id), productId: String(row.product_id), hash: String(row.hash),
      product: JSON.parse(String(row.product_json)), firstSeenAt: String(row.first_seen_at), lastSeenAt: String(row.last_seen_at)
    }));
  }

  reconcileSavedSearchResults(searchId: number, runId: number, sourceId: string, results: Array<{ productId: string; hash: string; product: JsonObject }>, observedAt: string): SavedSearchEvent[] {
    const previous = new Map(this.listSavedSearchResults(searchId, sourceId).map((item) => [item.productId, item]));
    const events: SavedSearchEvent[] = [];
    const insertEvent = (productId: string, eventType: SavedSearchEvent["eventType"]) => {
      const result = this.db.query("INSERT INTO saved_search_events (search_id, run_id, source_id, product_id, event_type, observed_at) VALUES (?, ?, ?, ?, ?, ?)")
        .run(searchId, runId, sourceId, productId, eventType, observedAt);
      events.push({ id: Number(result.lastInsertRowid), searchId, runId, sourceId, productId, eventType, observedAt });
    };
    for (const item of results) {
      const old = previous.get(item.productId);
      this.db.query(`
        INSERT INTO saved_search_results (search_id, source_id, product_id, hash, product_json, first_seen_at, last_seen_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(search_id, source_id, product_id) DO UPDATE SET hash = excluded.hash, product_json = excluded.product_json, last_seen_at = excluded.last_seen_at
      `).run(searchId, sourceId, item.productId, item.hash, JSON.stringify(item.product), old?.firstSeenAt ?? observedAt, observedAt);
      if (!old) insertEvent(item.productId, "search_result.entered");
      else if (old.hash !== item.hash) insertEvent(item.productId, "search_result.changed");
      previous.delete(item.productId);
    }
    for (const productId of previous.keys()) {
      this.db.query("DELETE FROM saved_search_results WHERE search_id = ? AND source_id = ? AND product_id = ?").run(searchId, sourceId, productId);
      insertEvent(productId, "search_result.left");
    }
    return events;
  }

  listSavedSearchEvents(searchId: number, limit = 500): SavedSearchEvent[] {
    return (this.db.query("SELECT * FROM saved_search_events WHERE search_id = ? ORDER BY id DESC LIMIT ?").all(searchId, limit) as Record<string, unknown>[]).map((row) => ({
      id: Number(row.id), searchId: Number(row.search_id), runId: Number(row.run_id), sourceId: String(row.source_id),
      productId: String(row.product_id), eventType: row.event_type as SavedSearchEvent["eventType"], observedAt: String(row.observed_at)
    }));
  }

  addLLMProvider(input: Omit<LLMProvider, "id" | "createdAt" | "updatedAt">): LLMProvider {
    const now = new Date().toISOString();
    const name = input.name?.trim() || providerDisplayName(input.provider);
    this.db.transaction(() => {
      if (input.isDefault) {
        this.db.query("UPDATE llm_providers SET is_default = 0").run();
      }
      this.db.query(`
        INSERT INTO llm_providers (name, provider, config_json, model, is_default, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(name, input.provider, input.configJson, input.model, input.isDefault ? 1 : 0, now, now);
    })();
    const row = this.db.query("SELECT * FROM llm_providers ORDER BY id DESC LIMIT 1").get() as Record<string, unknown>;
    return this.mapLLMProvider(row);
  }

  updateLLMProvider(id: number, input: Partial<Omit<LLMProvider, "id" | "createdAt" | "updatedAt">>): LLMProvider | null {
    const previous = this.llmProvider(id);
    if (!previous) return null;
    const now = new Date().toISOString();
    this.db.transaction(() => {
      if (input.isDefault) {
        this.db.query("UPDATE llm_providers SET is_default = 0").run();
      }
      const sets = [];
      const params: any[] = [];
      if (input.name !== undefined) { sets.push("name = ?"); params.push(input.name.trim() || providerDisplayName(input.provider ?? previous.provider)); }
      if (input.provider !== undefined) { sets.push("provider = ?"); params.push(input.provider); }
      if (input.configJson !== undefined) { sets.push("config_json = ?"); params.push(input.configJson); }
      if (input.model !== undefined) { sets.push("model = ?"); params.push(input.model); }
      if (input.isDefault !== undefined) { sets.push("is_default = ?"); params.push(input.isDefault ? 1 : 0); }
      sets.push("updated_at = ?");
      params.push(now);
      params.push(id);
      this.db.query(`UPDATE llm_providers SET ${sets.join(", ")} WHERE id = ?`).run(...params);
    })();
    return this.llmProvider(id);
  }

  deleteLLMProvider(id: number): boolean {
    return this.db.query("DELETE FROM llm_providers WHERE id = ?").run(id).changes > 0;
  }

  llmProvider(id: number): LLMProvider | null {
    const row = this.db.query("SELECT * FROM llm_providers WHERE id = ?").get(id) as Record<string, unknown> | null;
    return row ? this.mapLLMProvider(row) : null;
  }

  getDefaultLLMProvider(): LLMProvider | null {
    const row = this.db.query("SELECT * FROM llm_providers WHERE is_default = 1").get() as Record<string, unknown> | null;
    return row ? this.mapLLMProvider(row) : null;
  }

  listLLMProviders(): LLMProvider[] {
    return (this.db.query("SELECT * FROM llm_providers ORDER BY name").all() as Record<string, unknown>[]).map((row) => this.mapLLMProvider(row));
  }

  private mapLLMProvider(row: Record<string, unknown>): LLMProvider {
    return {
      id: Number(row.id),
      name: String(row.name),
      provider: String(row.provider),
      configJson: String(row.config_json),
      model: String(row.model),
      isDefault: Number(row.is_default) === 1,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    };
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
      titleSource: String(row.title_source ?? "default") as Conversation["titleSource"],
      previousResponseId: row.previous_response_id ? String(row.previous_response_id) : null,
      archivedAt: row.archived_at ? String(row.archived_at) : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    };
  }

  private mapAssistantRun(row: Record<string, unknown>): AssistantRun {
    return {
      id: Number(row.id), conversationId: Number(row.conversation_id), userMessageId: Number(row.user_message_id),
      assistantMessageId: Number(row.assistant_message_id), providerId: row.provider_id === null ? null : Number(row.provider_id),
      model: String(row.model), status: row.status as AssistantRunStatus, error: row.error ? String(row.error) : null,
      cancelRequested: Number(row.cancel_requested) === 1, createdAt: String(row.created_at),
      startedAt: row.started_at ? String(row.started_at) : null, completedAt: row.completed_at ? String(row.completed_at) : null
    };
  }

  private mapSavedSearch(row: Record<string, unknown>): SavedSearch {
    return {
      id: Number(row.id), name: String(row.name), query: String(row.query), sourceIds: JSON.parse(String(row.source_ids_json)),
      watched: Number(row.watched) === 1, enabled: Number(row.enabled) === 1, intervalMinutes: Number(row.interval_minutes),
      nextRunAt: row.next_run_at ? String(row.next_run_at) : null, lastRunAt: row.last_run_at ? String(row.last_run_at) : null,
      lastRunStatus: row.last_run_status ? String(row.last_run_status) : null, createdAt: String(row.created_at), updatedAt: String(row.updated_at)
    };
  }
}
