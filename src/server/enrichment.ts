import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import OpenAI from "openai";
import { Database } from "bun:sqlite";
import { OperationsDatabase } from "./operations/database.ts";
import { createOpenAIClient, type ProviderClientOptionsInput } from "./lib/openai-compatible.ts";
import { logger } from "./lib/logger.ts";

export const ENRICHMENT_RESULT_TABLES = [
  "product_offering_enrichment_proposals",
  "product_offering_label_proposals",
  "product_label_proposals",
  "category_assignment_proposals",
  "new_label_proposals",
  "new_category_proposals",
  "canonical_product_match_proposals",
  "new_canonical_product_proposals",
  "specification_extraction_proposals",
  "identifier_extraction_proposals",
  "review_flags",
  "agent_notes",
  "validation_errors"
] as const;

export interface EnrichmentWorkspace {
  runId: string;
  directory: string;
  databasePath: string;
  instructionsPath: string;
}

export interface EnrichmentAgentHarness {
  prepare(runId: string): EnrichmentWorkspace;
  exportSourceData(workspace: EnrichmentWorkspace, production: OperationsDatabase): void;
  buildInstructions(workspace: EnrichmentWorkspace): string;
  run(workspace: EnrichmentWorkspace): Promise<{ code: number; stdout: string; stderr: string }>;
  validate(workspace: EnrichmentWorkspace): string[];
}

export function parseAgentCommand(value: string): string[] {
  const parts: string[] = [];
  let current = "";
  let quote = "";
  let escape = false;
  for (const char of value.trim()) {
    if (escape) { current += char; escape = false; continue; }
    if (char === "\\") { escape = true; continue; }
    if (quote) {
      if (char === quote) quote = "";
      else current += char;
      continue;
    }
    if (char === "'" || char === '"') { quote = char; continue; }
    if (/\s/.test(char)) {
      if (current) { parts.push(current); current = ""; }
    } else current += char;
  }
  if (escape) current += "\\";
  if (quote) throw new Error("ENRICHMENT_AGENT_COMMAND contains an unterminated quote");
  if (current) parts.push(current);
  return parts;
}

export interface EmbeddingProvider {
  readonly name: string;
  readonly model: string;
  embed(texts: string[]): Promise<number[][]>;
}

export class OpenAICompatibleEmbeddingProvider implements EmbeddingProvider {
  readonly name: string;
  readonly model: string;
  private readonly client: OpenAI;

  constructor(input: { provider: string; configJson: string; model: string; name?: string }) {
    this.name = input.name ?? input.provider;
    this.model = input.model;
    this.client = createOpenAIClient({ ...JSON.parse(input.configJson), provider: input.provider } as ProviderClientOptionsInput);
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (!texts.length) return [];
    logger.info({
      msg: "Requesting LLM embeddings",
      provider: this.name,
      model: this.model,
      inputCount: texts.length,
    });
    try {
      const response = await this.client.embeddings.create({ model: this.model, input: texts });
      logger.debug({
        msg: "Received LLM embeddings response",
        provider: this.name,
        model: this.model,
        outputCount: response.data.length,
      });
      return response.data.map((item: any) => item.embedding);
    } catch (err) {
      logger.error({
        msg: "LLM embeddings request failed",
        provider: this.name,
        model: this.model,
        error: (err as Error).message,
      });
      throw err;
    }
  }
}

export interface ProposalApplicationResult {
  appliedCanonicalMatches: number;
  createdCanonicalProducts: number;
  appliedLabels: number;
  appliedSpecifications: number;
  appliedIdentifiers: number;
  appliedCategories: number;
  reviewRequired: number;
  errors: string[];
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeCapacity(value: string): string {
  const match = value.match(/(\d+(?:\.\d+)?)\s*(tb|gb)/i);
  if (!match) return normalizeText(value);
  const amount = Number(match[1]);
  const unit = match[2]!.toUpperCase();
  if (unit === "GB" && amount >= 1000 && amount % 1000 === 0) return `${amount / 1000} TB`;
  return `${Number.isInteger(amount) ? amount : amount.toFixed(1)} ${unit}`;
}

function collectTextValues(value: unknown, output: string[] = []): string[] {
  if (typeof value === "string") output.push(value);
  else if (Array.isArray(value)) for (const item of value) collectTextValues(item, output);
  else if (value && typeof value === "object") for (const item of Object.values(value)) collectTextValues(item, output);
  return output;
}

function deterministicExtractions(offering: Record<string, any>): Array<{ kind: string; name: string; value: string; normalized: string; confidence: number }> {
  const raw = collectTextValues(offering).join("\n");
  const title = String(offering.summary?.name ?? offering.product?.title ?? offering.product?.name ?? "");
  const output: Array<{ kind: string; name: string; value: string; normalized: string; confidence: number }> = [];
  const seen = new Set<string>();
  const push = (item: { kind: string; name: string; value: string; normalized: string; confidence: number }) => {
    const key = `${item.kind}:${item.name}:${item.normalized}`;
    if (!seen.has(key)) { seen.add(key); output.push(item); }
  };
  const identifiers: Array<[string, RegExp]> = [
    ["ean", /\b(?:EAN|GTIN)[\s:#-]*(\d{8}|\d{12,14})\b/i],
    ["upc", /\bUPC[\s:#-]*(\d{12})\b/i],
    ["isbn", /\bISBN(?:-1[03])?[\s:#-]*([0-9X-]{10,17})\b/i],
    ["mpn", /\b(?:MPN|manufacturer part number)[\s:#-]*([A-Z0-9._/-]{4,})\b/i]
  ];
  for (const [name, pattern] of identifiers) {
    const match = raw.match(pattern);
    if (match?.[1]) push({ kind: "identifier", name, value: match[1], normalized: match[1].toUpperCase().replace(/[^A-Z0-9]/g, ""), confidence: .98 });
  }
  for (const [name, pattern] of [
    ["capacity", /\b(\d+(?:\.\d+)?)\s*(TB|GB)\b/i],
    ["connector_type", /\b(USB[\s-]?C|USB[\s-]?A|LIGHTNING|THUNDERBOLT\s*\d?)\b/i],
    ["color", /\b(black|white|blue|red|green|gray|grey|silver|gold|pink|purple|yellow|orange)\b/i],
    ["condition", /\b(refurbished|used|open[\s-]?box|new|damaged packaging)\b/i],
    ["size", /\b(xs|s|m|l|xl|xxl|\d{2,3}\s?(?:cm|mm|inch|in|"))\b/i]
  ] as const) {
    const match = title.match(pattern);
    if (match?.[0]) {
      const normalized = name === "capacity" ? normalizeCapacity(match[0]) : normalizeText(match[0]).replace("usb c", "usb-c").replace("grey", "gray").replace("open box", "open-box");
      push({ kind: "specification", name, value: match[0], normalized, confidence: .9 });
    }
  }
  return output;
}

function lexicalScore(left: string, right: string): number {
  const a = new Set(normalizeText(left).split(/[^a-z0-9]+/).filter(Boolean));
  const b = new Set(normalizeText(right).split(/[^a-z0-9]+/).filter(Boolean));
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((token) => b.has(token)).length;
  return intersection / (a.size + b.size - intersection);
}

function cosineSimilarity(left: number[], right: number[]): number {
  if (!left.length || left.length !== right.length) return 0;
  let dot = 0, leftNorm = 0, rightNorm = 0;
  for (let index = 0; index < left.length; index++) {
    dot += left[index]! * right[index]!;
    leftNorm += left[index]! ** 2;
    rightNorm += right[index]! ** 2;
  }
  return leftNorm && rightNorm ? dot / Math.sqrt(leftNorm * rightNorm) : 0;
}

function offeringEmbeddingText(offering: Record<string, any>): string {
  const summary = offering.summary ?? {};
  const product = offering.product ?? {};
  return [summary.name, product.title, product.description, ...(summary.categoryNames ?? []), JSON.stringify(product.attributes ?? {})].filter(Boolean).join("\n");
}

function canonicalEmbeddingText(product: Record<string, any>): string {
  return [product.name, product.brand, product.model, product.variant_identity_json].filter(Boolean).join("\n");
}

export async function updateEmbeddingsAndCandidates(production: OperationsDatabase, provider: EmbeddingProvider, minimumScore = .65): Promise<number> {
  const offerings = production.listPendingEnrichmentOfferings() as Record<string, any>[];
  const products = production.listCanonicalProducts() as Record<string, any>[];
  const existingOfferingVectors = new Map((production.db.query("SELECT * FROM product_offering_embeddings WHERE provider = ? AND model = ?").all(provider.name, provider.model) as any[])
    .map((row) => [Number(row.product_offering_id), row]));
  const existingProductVectors = new Map((production.db.query("SELECT * FROM canonical_product_embeddings WHERE provider = ? AND model = ?").all(provider.name, provider.model) as any[])
    .map((row) => [Number(row.canonical_product_id), row]));
  const offeringVectors = new Map<number, number[]>();
  const productVectors = new Map<number, number[]>();
  const missingOfferings = offerings.filter((row) => existingOfferingVectors.get(Number(row.id))?.source_hash !== String(row.hash));
  const missingProducts = products.filter((row) => existingProductVectors.get(Number(row.id))?.source_hash !== String(row.updated_at ?? row.id));
  const newOfferingVectors = missingOfferings.length ? await provider.embed(missingOfferings.map((row) => offeringEmbeddingText(JSON.parse(row.offering_json)))) : [];
  const newProductVectors = missingProducts.length ? await provider.embed(missingProducts.map(canonicalEmbeddingText)) : [];
  offerings.forEach((row) => {
    const existing = existingOfferingVectors.get(Number(row.id));
    if (existing?.source_hash === String(row.hash)) offeringVectors.set(Number(row.id), JSON.parse(existing.embedding_json));
  });
  products.forEach((row) => {
    const existing = existingProductVectors.get(Number(row.id));
    if (existing?.source_hash === String(row.updated_at ?? row.id)) productVectors.set(Number(row.id), JSON.parse(existing.embedding_json));
  });
  missingOfferings.forEach((row, index) => {
    const embedding = newOfferingVectors[index]!;
    offeringVectors.set(Number(row.id), embedding);
    production.upsertEmbedding({ scope: "ProductOffering", targetId: Number(row.id), sourceHash: String(row.hash), provider: provider.name, model: provider.model, embedding });
  });
  missingProducts.forEach((row, index) => {
    const embedding = newProductVectors[index]!;
    productVectors.set(Number(row.id), embedding);
    production.upsertEmbedding({ scope: "Product", targetId: Number(row.id), sourceHash: String(row.updated_at ?? row.id), provider: provider.name, model: provider.model, embedding });
  });
  let candidates = 0;
  production.db.exec("CREATE TABLE IF NOT EXISTS product_embedding_candidates (product_offering_id INTEGER, canonical_product_id INTEGER, score REAL, updated_at TEXT NOT NULL, PRIMARY KEY(product_offering_id, canonical_product_id))");
  const upsert = production.db.query("INSERT OR REPLACE INTO product_embedding_candidates VALUES (?, ?, ?, ?)");
  offerings.forEach((offering) => products.forEach((product) => {
    const score = cosineSimilarity(offeringVectors.get(Number(offering.id))!, productVectors.get(Number(product.id))!);
    if (score >= minimumScore) { upsert.run(offering.id, product.id, score, new Date().toISOString()); candidates++; }
  }));
  return candidates;
}

function sourceTableDigest(db: Database, table: string): string {
  const rows = db.query(`SELECT * FROM ${table} ORDER BY rowid`).all();
  return Bun.hash(JSON.stringify(rows)).toString(16);
}

function sourceTableNames(db: Database): string[] {
  return (db.query("SELECT table_name FROM enrichment_contract WHERE writable = 0 AND table_name <> 'enrichment_contract' ORDER BY table_name").all() as Array<{ table_name: string }>)
    .map((row) => row.table_name);
}

function commonProposalColumns(): string {
  return `
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    enrichment_run_id TEXT NOT NULL,
    source_product_offering_id INTEGER NOT NULL,
    target_entity_type TEXT NOT NULL,
    target_entity_id INTEGER,
    proposed_value_json TEXT NOT NULL,
    normalized_proposed_value TEXT,
    confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
    evidence_json TEXT NOT NULL DEFAULT '[]',
    reasoning_summary TEXT NOT NULL DEFAULT '',
    review_state TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    agent_metadata_json TEXT NOT NULL DEFAULT '{}'
  `;
}

export function createEnrichmentDatabase(databasePath: string, runId: string): Database {
  const db = new Database(databasePath, { create: true });
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  db.exec(`
    CREATE TABLE enrichment_contract (table_name TEXT PRIMARY KEY, writable INTEGER NOT NULL);
    CREATE TABLE pending_product_offerings (
      id INTEGER PRIMARY KEY, store_id TEXT NOT NULL, external_id TEXT NOT NULL,
      hash TEXT NOT NULL, offering_json TEXT NOT NULL, reason TEXT NOT NULL, queued_at TEXT NOT NULL
    );
    CREATE TABLE existing_labels (id INTEGER PRIMARY KEY, name TEXT, normalized_name TEXT, scope TEXT, description TEXT);
    CREATE TABLE existing_categories (id INTEGER PRIMARY KEY, parent_id INTEGER, name TEXT, normalized_name TEXT, normalized_path TEXT, description TEXT);
    CREATE TABLE existing_canonical_products (id INTEGER PRIMARY KEY, name TEXT, normalized_name TEXT, brand TEXT, model TEXT, variant_identity_json TEXT, category_id INTEGER);
    CREATE TABLE existing_product_identifiers (id INTEGER PRIMARY KEY, canonical_product_id INTEGER, product_offering_id INTEGER, identifier_type TEXT, normalized_value TEXT);
    CREATE TABLE existing_product_specifications (id INTEGER PRIMARY KEY, canonical_product_id INTEGER, normalized_name TEXT, normalized_value TEXT);
    CREATE TABLE product_offering_embeddings (product_offering_id INTEGER PRIMARY KEY, embedding_json TEXT NOT NULL);
    CREATE TABLE canonical_product_embeddings (canonical_product_id INTEGER PRIMARY KEY, embedding_json TEXT NOT NULL);
    CREATE TABLE embedding_candidate_matches (product_offering_id INTEGER, canonical_product_id INTEGER, score REAL, PRIMARY KEY(product_offering_id, canonical_product_id));
    CREATE TABLE category_candidate_matches (product_offering_id INTEGER, category_id INTEGER, score REAL, PRIMARY KEY(product_offering_id, category_id));
    CREATE TABLE label_candidate_matches (product_offering_id INTEGER, label_id INTEGER, score REAL, PRIMARY KEY(product_offering_id, label_id));
    CREATE TABLE deterministic_extraction_results (product_offering_id INTEGER, kind TEXT, name TEXT, value TEXT, normalized_value TEXT, confidence REAL);
    CREATE TABLE similar_product_offerings (product_offering_id INTEGER, similar_product_offering_id INTEGER, score REAL, PRIMARY KEY(product_offering_id, similar_product_offering_id));
    CREATE TABLE prior_enrichment_decisions (source_product_offering_id INTEGER, decision_type TEXT, decision_json TEXT, created_at TEXT);
    CREATE INDEX idx_pending_offerings_store ON pending_product_offerings(store_id, external_id);
    CREATE INDEX idx_existing_identifier ON existing_product_identifiers(identifier_type, normalized_value);
    CREATE INDEX idx_existing_products_identity ON existing_canonical_products(brand, model);
    CREATE INDEX idx_existing_labels_name ON existing_labels(normalized_name, scope);
    CREATE INDEX idx_existing_categories_path ON existing_categories(normalized_path);
    CREATE INDEX idx_embedding_candidates ON embedding_candidate_matches(product_offering_id, score DESC);
    CREATE INDEX idx_category_candidates ON category_candidate_matches(product_offering_id, score DESC);
    CREATE INDEX idx_label_candidates ON label_candidate_matches(product_offering_id, score DESC);
  `);
  for (const table of ENRICHMENT_RESULT_TABLES) {
    db.exec(`CREATE TABLE ${table} (${commonProposalColumns()}); CREATE INDEX idx_${table}_source ON ${table}(enrichment_run_id, source_product_offering_id);`);
  }
  const contract = db.query("INSERT INTO enrichment_contract (table_name, writable) VALUES (?, ?)");
  for (const table of ["enrichment_contract", "pending_product_offerings", "existing_labels", "existing_categories", "existing_canonical_products",
    "existing_product_identifiers", "existing_product_specifications", "product_offering_embeddings", "canonical_product_embeddings",
    "embedding_candidate_matches", "category_candidate_matches", "label_candidate_matches", "deterministic_extraction_results", "similar_product_offerings", "prior_enrichment_decisions"]) contract.run(table, 0);
  for (const table of ENRICHMENT_RESULT_TABLES) contract.run(table, 1);
  db.query("INSERT INTO agent_notes (enrichment_run_id, source_product_offering_id, target_entity_type, proposed_value_json, confidence, created_at) VALUES (?, 0, 'run', '{}', 1, ?)")
    .run(runId, new Date().toISOString());
  return db;
}

export class CommandEnrichmentAgentHarness implements EnrichmentAgentHarness {
  constructor(private readonly options: { command: string[]; root?: string; timeoutMs?: number; model?: string }) {}

  prepare(runId: string): EnrichmentWorkspace {
    const directory = path.resolve(this.options.root ?? ".ecwid-sync/enrichment-runs", runId);
    mkdirSync(directory, { recursive: true });
    const workspace = { runId, directory, databasePath: path.join(directory, "enrichment.sqlite"), instructionsPath: path.join(directory, "instructions.md") };
    for (const file of [workspace.databasePath, `${workspace.databasePath}-wal`, `${workspace.databasePath}-shm`]) rmSync(file, { force: true });
    const db = createEnrichmentDatabase(workspace.databasePath, runId);
    db.close();
    writeFileSync(workspace.instructionsPath, this.buildInstructions(workspace));
    return workspace;
  }

  exportSourceData(workspace: EnrichmentWorkspace, production: OperationsDatabase): void {
    const db = new Database(workspace.databasePath);
    const insert = db.query("INSERT OR REPLACE INTO pending_product_offerings VALUES (?, ?, ?, ?, ?, ?, ?)");
    for (const row of production.listPendingEnrichmentOfferings() as any[]) {
      insert.run(row.id, row.store_id, row.external_id, row.hash, row.offering_json, row.reason, row.queued_at);
    }
    const copy = (target: string, select: string) => {
      const rows = production.db.query(select).all() as Record<string, unknown>[];
      for (const row of rows) {
        const columns = Object.keys(row);
        db.query(`INSERT INTO ${target} (${columns.join(",")}) VALUES (${columns.map(() => "?").join(",")})`).run(...columns.map((key) => row[key] as any));
      }
    };
    copy("existing_labels", "SELECT id, name, normalized_name, scope, description FROM labels");
    copy("existing_categories", "SELECT id, parent_id, name, normalized_name, normalized_path, description FROM categories");
    copy("existing_canonical_products", "SELECT id, name, normalized_name, brand, model, variant_identity_json, category_id FROM canonical_products");
    copy("existing_product_identifiers", "SELECT id, canonical_product_id, product_offering_id, identifier_type, normalized_value FROM product_identifiers");
    copy("existing_product_specifications", "SELECT id, canonical_product_id, normalized_name, normalized_value FROM product_specifications");
    copy("product_offering_embeddings", "SELECT product_offering_id, embedding_json FROM product_offering_embeddings");
    copy("canonical_product_embeddings", "SELECT canonical_product_id, embedding_json FROM canonical_product_embeddings");
    const productionCandidates = production.db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='product_embedding_candidates'").get();
    if (productionCandidates) copy("embedding_candidate_matches", "SELECT product_offering_id, canonical_product_id, score FROM product_embedding_candidates");
    const pending = db.query("SELECT id, offering_json FROM pending_product_offerings").all() as Array<{ id: number; offering_json: string }>;
    const extraction = db.query("INSERT INTO deterministic_extraction_results VALUES (?, ?, ?, ?, ?, ?)");
    for (const row of pending) {
      const offering = JSON.parse(row.offering_json);
      for (const item of deterministicExtractions(offering)) extraction.run(row.id, item.kind, item.name, item.value, item.normalized, item.confidence);
    }
    const canonical = db.query("SELECT id, name FROM existing_canonical_products").all() as Array<{ id: number; name: string }>;
    const categories = db.query("SELECT id, name FROM existing_categories").all() as Array<{ id: number; name: string }>;
    const labels = db.query("SELECT id, name FROM existing_labels").all() as Array<{ id: number; name: string }>;
    const candidate = db.query("INSERT OR IGNORE INTO embedding_candidate_matches VALUES (?, ?, ?)");
    const categoryCandidate = db.query("INSERT OR IGNORE INTO category_candidate_matches VALUES (?, ?, ?)");
    const labelCandidate = db.query("INSERT OR IGNORE INTO label_candidate_matches VALUES (?, ?, ?)");
    const similar = db.query("INSERT OR IGNORE INTO similar_product_offerings VALUES (?, ?, ?)");
    for (const row of pending) {
      const offering = JSON.parse(row.offering_json);
      const title = String(offering.summary?.name ?? offering.product?.title ?? offering.product?.name ?? "");
      for (const product of canonical) {
        const score = lexicalScore(title, product.name);
        if (score >= .3) candidate.run(row.id, product.id, score);
      }
      for (const category of categories) {
        const score = lexicalScore(title, category.name);
        if (score >= .2) categoryCandidate.run(row.id, category.id, score);
      }
      for (const label of labels) {
        const score = lexicalScore(title, label.name);
        if (score >= .2) labelCandidate.run(row.id, label.id, score);
      }
      for (const other of pending) {
        if (other.id === row.id) continue;
        const otherOffering = JSON.parse(other.offering_json);
        const otherTitle = String(otherOffering.summary?.name ?? otherOffering.product?.title ?? otherOffering.product?.name ?? "");
        const score = lexicalScore(title, otherTitle);
        if (score >= .5) similar.run(row.id, other.id, score);
      }
    }
    const prior = db.query("INSERT INTO prior_enrichment_decisions VALUES (?, ?, ?, ?)");
    for (const row of production.db.query("SELECT * FROM product_offering_product_links WHERE review_state = 'accepted'").all() as any[]) {
      prior.run(row.product_offering_id, "canonical_product_match", JSON.stringify({ canonicalProductId: row.canonical_product_id, confidence: row.confidence, provenance: JSON.parse(row.provenance_json) }), row.updated_at);
    }
    db.exec("CREATE TABLE IF NOT EXISTS source_table_digests (table_name TEXT PRIMARY KEY, digest TEXT NOT NULL)");
    const digest = db.query("INSERT OR REPLACE INTO source_table_digests VALUES (?, ?)");
    for (const table of sourceTableNames(db)) digest.run(table, sourceTableDigest(db, table));
    db.query("INSERT OR IGNORE INTO enrichment_contract VALUES ('source_table_digests', 0)").run();
    for (const table of sourceTableNames(db)) {
      for (const operation of ["INSERT", "UPDATE", "DELETE"]) {
        db.exec(`CREATE TRIGGER IF NOT EXISTS readonly_${table}_${operation.toLowerCase()}
          BEFORE ${operation} ON ${table} BEGIN SELECT RAISE(ABORT, 'source table ${table} is read-only'); END;`);
      }
    }
    db.close();
  }

  buildInstructions(workspace: EnrichmentWorkspace): string {
    return `Process pending product offerings by autonomously querying SQLite at ${workspace.databasePath}.
Source tables are read-only. Only tables marked writable=1 in enrichment_contract may be changed.
Write structured proposals, evidence, confidence, review state, and metadata to result tables.
Prefer stable identifiers and variant-defining specifications over title similarity. Never guess ambiguous canonical matches.
Validate all inserted rows before finishing. Do not access production databases, unrelated files, or the network.`;
  }

  async run(workspace: EnrichmentWorkspace): Promise<{ code: number; stdout: string; stderr: string }> {
    const prompt = readFileSync(workspace.instructionsPath, "utf8");
    const proc = Bun.spawn([...this.options.command, prompt], {
      cwd: workspace.directory,
      env: { PATH: process.env.PATH ?? "", HOME: workspace.directory, ENRICHMENT_DATABASE_PATH: workspace.databasePath },
      stdout: "pipe", stderr: "pipe"
    });
    const timer = setTimeout(() => proc.kill(), this.options.timeoutMs ?? 300_000);
    const [code, stdout, stderr] = await Promise.all([proc.exited, new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
    clearTimeout(timer);
    writeFileSync(path.join(workspace.directory, "stdout.log"), stdout);
    writeFileSync(path.join(workspace.directory, "stderr.log"), stderr);
    return { code, stdout, stderr };
  }

  validate(workspace: EnrichmentWorkspace): string[] {
    const db = new Database(workspace.databasePath);
    const errors: string[] = [];
    const digests = db.query("SELECT table_name, digest FROM source_table_digests").all() as Array<{ table_name: string; digest: string }>;
    for (const item of digests) {
      if (sourceTableDigest(db, item.table_name) !== item.digest) errors.push(`forbidden write detected in source table ${item.table_name}`);
    }
    for (const table of ENRICHMENT_RESULT_TABLES) {
      const invalid = db.query(`SELECT COUNT(*) count FROM ${table} WHERE confidence IS NULL OR confidence < 0 OR confidence > 1`).get() as { count: number };
      if (invalid.count) errors.push(`${table} contains ${invalid.count} invalid confidence values`);
      const missing = db.query(`SELECT COUNT(*) count FROM ${table} r LEFT JOIN pending_product_offerings p ON p.id = r.source_product_offering_id WHERE r.source_product_offering_id <> 0 AND p.id IS NULL`).get() as { count: number };
      if (missing.count) errors.push(`${table} references ${missing.count} missing offerings`);
      for (const row of db.query(`SELECT id, proposed_value_json, evidence_json, agent_metadata_json FROM ${table}`).all() as any[]) {
        for (const field of ["proposed_value_json", "evidence_json", "agent_metadata_json"]) {
          try { JSON.parse(row[field]); } catch { errors.push(`${table}:${row.id} contains invalid ${field}`); }
        }
      }
    }
    const duplicateLabels = db.query(`
      SELECT COUNT(*) count FROM new_label_proposals p
      JOIN existing_labels l ON l.normalized_name = p.normalized_proposed_value
    `).get() as { count: number };
    if (duplicateLabels.count) errors.push(`new_label_proposals contains ${duplicateLabels.count} existing labels`);
    const duplicateCategories = db.query(`
      SELECT COUNT(*) count FROM new_category_proposals p
      JOIN existing_categories c ON c.normalized_path = p.normalized_proposed_value
    `).get() as { count: number };
    if (duplicateCategories.count) errors.push(`new_category_proposals contains ${duplicateCategories.count} existing categories`);
    const duplicateCanonicalProducts = db.query(`
      SELECT COUNT(*) count FROM new_canonical_product_proposals p
      JOIN existing_canonical_products c ON c.normalized_name = p.normalized_proposed_value
    `).get() as { count: number };
    if (duplicateCanonicalProducts.count) errors.push(`new_canonical_product_proposals contains ${duplicateCanonicalProducts.count} existing canonical products`);
    for (const proposal of db.query("SELECT id, proposed_value_json FROM new_category_proposals").all() as Array<{ id: number; proposed_value_json: string }>) {
      try {
        const value = JSON.parse(proposal.proposed_value_json);
        if (!value.name || !value.fullPath) errors.push(`new_category_proposals:${proposal.id} requires name and fullPath`);
        if (value.parentId && !db.query("SELECT 1 FROM existing_categories WHERE id = ?").get(value.parentId)) errors.push(`new_category_proposals:${proposal.id} references missing parent ${value.parentId}`);
      } catch { errors.push(`new_category_proposals:${proposal.id} contains invalid JSON`); }
    }
    db.query("DELETE FROM validation_errors").run();
    const validation = db.query(`INSERT INTO validation_errors
      (enrichment_run_id, source_product_offering_id, target_entity_type, proposed_value_json, confidence, reasoning_summary, review_state, created_at)
      VALUES (?, 0, 'validation', ?, 1, ?, 'pending', ?)`);
    for (const error of errors) validation.run(workspace.runId, JSON.stringify({ error }), error, new Date().toISOString());
    db.close();
    return errors;
  }

  async runWithRepair(workspace: EnrichmentWorkspace, maxRepairs = 1): Promise<{ code: number; stdout: string; stderr: string; validationErrors: string[] }> {
    let result = await this.run(workspace);
    let validationErrors = this.validate(workspace);
    for (let attempt = 0; attempt < maxRepairs && validationErrors.length; attempt++) {
      const repairPath = path.join(workspace.directory, `repair-${attempt + 1}.md`);
      writeFileSync(repairPath, `${this.buildInstructions(workspace)}

Repair only invalid result rows. Do not redo valid decisions.
Validation errors:
${validationErrors.map((error) => `- ${error}`).join("\n")}`);
      const original = workspace.instructionsPath;
      workspace.instructionsPath = repairPath;
      result = await this.run(workspace);
      workspace.instructionsPath = original;
      validationErrors = this.validate(workspace);
    }
    return { ...result, validationErrors };
  }
}

export function applyAcceptedProposals(workspace: EnrichmentWorkspace, production: OperationsDatabase, autoAcceptThreshold = .95): ProposalApplicationResult {
  const db = new Database(workspace.databasePath, { readonly: true });
  const errors: string[] = [];
  let appliedCanonicalMatches = 0;
  let createdCanonicalProducts = 0;
  let appliedLabels = 0;
  let appliedSpecifications = 0;
  let appliedIdentifiers = 0;
  let appliedCategories = 0;
  let reviewRequired = 0;
  const parseJson = (value: string, label: string): any | null => {
    try { return JSON.parse(value); } catch { errors.push(`${label} contains invalid JSON`); return null; }
  };
  const parseJsonOr = (value: string, fallback: unknown): any => {
    try { return JSON.parse(value); } catch { return fallback; }
  };
  const matches = db.query("SELECT * FROM canonical_product_match_proposals ORDER BY id").all() as Record<string, any>[];
  for (const proposal of matches) {
    if (proposal.review_state !== "accepted" || Number(proposal.confidence) < autoAcceptThreshold) {
      reviewRequired++;
      continue;
    }
    const target = Number(proposal.target_entity_id);
    const exists = production.db.query("SELECT 1 FROM canonical_products WHERE id = ?").get(target);
    const offering = production.db.query("SELECT 1 FROM product_offerings WHERE id = ?").get(Number(proposal.source_product_offering_id));
    if (!target || !exists || !offering) {
      errors.push(`canonical_product_match_proposals:${proposal.id} references a missing target or offering`);
      continue;
    }
    production.acceptCanonicalMatch({
      runId: String(proposal.enrichment_run_id),
      productOfferingId: Number(proposal.source_product_offering_id),
      canonicalProductId: target,
      confidence: Number(proposal.confidence),
      evidence: parseJsonOr(String(proposal.evidence_json), []),
      agentMetadata: parseJsonOr(String(proposal.agent_metadata_json), {})
    });
    appliedCanonicalMatches++;
  }
  const accepted = (table: string) => db.query(`SELECT * FROM ${table} WHERE review_state = 'accepted' ORDER BY id`).all() as Record<string, any>[];
  const unapplied = (table: string) => accepted(table).filter((proposal) => !production.hasAppliedEnrichmentProposal(proposal.enrichment_run_id, table, proposal.id));
  const markApplied = (table: string, proposal: Record<string, any>, result: unknown = {}) => production.markEnrichmentProposalApplied(proposal.enrichment_run_id, table, proposal.id, result);
  const provenance = (proposal: Record<string, any>) => ({ enrichmentRunId: proposal.enrichment_run_id, evidence: parseJsonOr(proposal.evidence_json, []), agent: parseJsonOr(proposal.agent_metadata_json, {}) });
  for (const proposal of unapplied("new_canonical_product_proposals")) {
    const value = parseJson(proposal.proposed_value_json, `new_canonical_product_proposals:${proposal.id}`);
    if (!value) continue;
    if (!value.name) { errors.push(`new_canonical_product_proposals:${proposal.id} requires name`); continue; }
    const productId = production.createCanonicalProduct({ name: value.name, brand: value.brand, model: value.model, variantIdentity: value.variantIdentity, categoryId: value.categoryId, reviewState: "accepted" });
    production.acceptCanonicalMatch({ runId: proposal.enrichment_run_id, productOfferingId: proposal.source_product_offering_id, canonicalProductId: productId, confidence: proposal.confidence, evidence: parseJsonOr(proposal.evidence_json, []), agentMetadata: parseJsonOr(proposal.agent_metadata_json, {}) });
    markApplied("new_canonical_product_proposals", proposal, { canonicalProductId: productId });
    createdCanonicalProducts++;
  }
  for (const table of ["product_offering_label_proposals", "product_label_proposals"]) {
    for (const proposal of unapplied(table)) {
      const value = parseJson(proposal.proposed_value_json, `${table}:${proposal.id}`);
      if (!value) continue;
      const scope = table === "product_label_proposals" ? "Product" : "ProductOffering";
      const labelId = value.labelId ?? (value.name ? production.createOrReuseLabel({ name: value.name, scope, description: value.description }) : 0);
      const targetId = proposal.target_entity_id ?? (scope === "ProductOffering" ? proposal.source_product_offering_id : 0);
      if (!labelId || !targetId) { errors.push(`${table}:${proposal.id} requires label and target`); continue; }
      production.attachLabel({ scope, targetId, labelId, provenance: provenance(proposal) });
      markApplied(table, proposal, { labelId, targetId });
      appliedLabels++;
    }
  }
  for (const proposal of unapplied("specification_extraction_proposals")) {
    const value = parseJson(proposal.proposed_value_json, `specification_extraction_proposals:${proposal.id}`);
    if (!value) continue;
    const scope = value.scope === "Product" ? "Product" : "ProductOffering";
    const targetId = proposal.target_entity_id ?? (scope === "ProductOffering" ? proposal.source_product_offering_id : 0);
    if (!value.name || !targetId) { errors.push(`specification_extraction_proposals:${proposal.id} requires name and target`); continue; }
    production.addSpecification({ scope, targetId, name: value.name, value: value.value, normalizedValue: proposal.normalized_proposed_value ?? value.normalizedValue, confidence: proposal.confidence, provenance: provenance(proposal) });
    markApplied("specification_extraction_proposals", proposal, { targetId });
    appliedSpecifications++;
  }
  for (const proposal of unapplied("identifier_extraction_proposals")) {
    const value = parseJson(proposal.proposed_value_json, `identifier_extraction_proposals:${proposal.id}`);
    if (!value) continue;
    if (!value.type || !value.value) { errors.push(`identifier_extraction_proposals:${proposal.id} requires type and value`); continue; }
    try {
      production.addProductIdentifier({
        canonicalProductId: value.scope === "Product" ? proposal.target_entity_id : undefined,
        productOfferingId: value.scope === "Product" ? undefined : proposal.source_product_offering_id,
        type: value.type, value: value.value, confidence: proposal.confidence, provenance: provenance(proposal)
      });
      markApplied("identifier_extraction_proposals", proposal);
      appliedIdentifiers++;
    } catch (error) { errors.push(`identifier_extraction_proposals:${proposal.id} ${(error as Error).message}`); }
  }
  for (const proposal of unapplied("new_category_proposals")) {
    const value = parseJson(proposal.proposed_value_json, `new_category_proposals:${proposal.id}`);
    if (!value) continue;
    if (!value.name || !value.fullPath) { errors.push(`new_category_proposals:${proposal.id} requires name and fullPath`); continue; }
    const categoryId = production.createOrReuseCategory({ name: value.name, fullPath: value.fullPath, parentId: value.parentId, description: value.description });
    markApplied("new_category_proposals", proposal, { categoryId });
    appliedCategories++;
  }
  for (const proposal of unapplied("category_assignment_proposals")) {
    const value = parseJson(proposal.proposed_value_json, `category_assignment_proposals:${proposal.id}`);
    if (!value) continue;
    const categoryId = Number(proposal.target_entity_id ?? value.categoryId);
    const scope = value.scope === "Product" ? "Product" : "ProductOffering";
    const targetId = Number(value.targetId ?? (scope === "ProductOffering" ? proposal.source_product_offering_id : 0));
    if (!categoryId || !targetId) { errors.push(`category_assignment_proposals:${proposal.id} requires category and target`); continue; }
    production.assignCategory({ scope, targetId, categoryId });
    markApplied("category_assignment_proposals", proposal, { categoryId, targetId });
    appliedCategories++;
  }
  for (const table of ["new_label_proposals", "new_category_proposals"]) {
    reviewRequired += Number((db.query(`SELECT COUNT(*) count FROM ${table} WHERE review_state <> 'accepted'`).get() as { count: number }).count);
  }
  for (const proposal of unapplied("new_label_proposals")) {
    const value = parseJson(proposal.proposed_value_json, `new_label_proposals:${proposal.id}`);
    if (!value) continue;
    if (!value.name || !value.scope) { errors.push(`new_label_proposals:${proposal.id} requires name and scope`); continue; }
    const labelId = production.createOrReuseLabel({ name: value.name, scope: value.scope, description: value.description });
    markApplied("new_label_proposals", proposal, { labelId });
    appliedLabels++;
  }
  for (const proposal of unapplied("product_offering_enrichment_proposals")) {
    const value = parseJson(proposal.proposed_value_json, `product_offering_enrichment_proposals:${proposal.id}`);
    if (!value) continue;
    if (!value.field) { errors.push(`product_offering_enrichment_proposals:${proposal.id} requires field`); continue; }
    production.addSpecification({
      scope: "ProductOffering",
      targetId: proposal.source_product_offering_id,
      name: value.field,
      value: value.value,
      normalizedValue: proposal.normalized_proposed_value ?? value.normalizedValue,
      confidence: proposal.confidence,
      provenance: provenance(proposal)
    });
    markApplied("product_offering_enrichment_proposals", proposal);
    appliedSpecifications++;
  }
  db.close();
  return { appliedCanonicalMatches, createdCanonicalProducts, appliedLabels, appliedSpecifications, appliedIdentifiers, appliedCategories, reviewRequired, errors };
}

export function listEnrichmentProposals(workspace: EnrichmentWorkspace): Record<string, unknown[]> {
  const db = new Database(workspace.databasePath, { readonly: true });
  const result: Record<string, unknown[]> = {};
  for (const table of ENRICHMENT_RESULT_TABLES) result[table] = db.query(`SELECT * FROM ${table} ORDER BY id`).all();
  db.close();
  return result;
}

export function setProposalReviewState(workspace: EnrichmentWorkspace, table: string, id: number, reviewState: "pending" | "accepted" | "rejected"): boolean {
  if (!(ENRICHMENT_RESULT_TABLES as readonly string[]).includes(table)) throw new Error(`unknown proposal table ${table}`);
  const db = new Database(workspace.databasePath);
  const changed = db.query(`UPDATE ${table} SET review_state = ? WHERE id = ?`).run(reviewState, id).changes > 0;
  db.close();
  return changed;
}
