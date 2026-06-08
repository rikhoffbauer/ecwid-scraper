import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Database } from "bun:sqlite";
import { applyAcceptedProposals, CommandEnrichmentAgentHarness, ENRICHMENT_RESULT_TABLES, listEnrichmentProposals, parseAgentCommand, setProposalReviewState, updateEmbeddingsAndCandidates } from "../src/server/enrichment.ts";
import { OperationsDatabase } from "../src/server/operations/database.ts";
import { createServer } from "../src/server/server.ts";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function setup() {
  const root = path.join(os.tmpdir(), `enrichment-${crypto.randomUUID()}`);
  roots.push(root);
  const production = new OperationsDatabase(path.join(root, "production.sqlite"));
  return { root, production };
}

describe("canonical product enrichment foundation", () => {
  test("migrates legacy products to offerings and queues changed offerings idempotently", () => {
    const { production } = setup();
    production.upsertProduct("store", "sku-1", "hash-1", { summary: { name: "SSD" } });
    production.upsertProduct("store", "sku-1", "hash-1", { summary: { name: "SSD" } });
    expect(production.listProductOfferings()).toHaveLength(1);
    expect(production.listPendingEnrichmentOfferings()).toHaveLength(1);
    production.upsertProduct("store", "sku-1", "hash-2", { summary: { name: "SSD blue" } });
    expect(production.listPendingEnrichmentOfferings()).toHaveLength(1);
    production.close();
  });

  test("migrates legacy events and flags and writes only offering-specific tables", () => {
    const root = path.join(os.tmpdir(), `legacy-offerings-${crypto.randomUUID()}`);
    roots.push(root);
    mkdirSync(root, { recursive: true });
    const file = path.join(root, "production.sqlite");
    const legacy = new Database(file, { create: true });
    legacy.exec(`
      CREATE TABLE products (id INTEGER PRIMARY KEY, store_id TEXT, product_id TEXT, hash TEXT, product_json TEXT, product_summary TEXT, created_at TEXT, updated_at TEXT, UNIQUE(store_id, product_id));
      CREATE TABLE product_events (id INTEGER PRIMARY KEY, event_id TEXT UNIQUE, store_id TEXT, product_id TEXT, event_type TEXT, run_id TEXT, observed_at TEXT, event_json TEXT);
      CREATE TABLE product_flags (id INTEGER PRIMARY KEY, source_id TEXT, product_id TEXT, label TEXT, rationale TEXT, confidence REAL, created_at TEXT, created_by TEXT, UNIQUE(source_id, product_id, label));
      INSERT INTO products VALUES (1, 'store', 'item', 'hash', '{}', '{}', 'now', 'now');
      INSERT INTO product_events VALUES (1, 'event-1', 'store', 'item', 'product.created', 'run', 'now', '{"eventId":"event-1"}');
      INSERT INTO product_flags VALUES (1, 'store', 'item', 'review', 'legacy', .8, 'now', 'user');
    `);
    legacy.close();
    const production = new OperationsDatabase(file);
    expect(existsSync(`${file}.pre-product-offerings.sqlite`)).toBe(true);
    expect(production.listEvents()).toHaveLength(1);
    expect(production.listFlags()).toHaveLength(1);
    production.addFlag({ sourceId: "store", productId: "item", label: "new", rationale: "", confidence: 1, createdBy: "test" });
    expect((production.db.query("SELECT COUNT(*) count FROM product_offering_flags").get() as any).count).toBe(2);
    expect((production.db.query("SELECT COUNT(*) count FROM product_flags").get() as any).count).toBe(1);
    production.close();
  });

  test("parses quoted agent commands without losing arguments", () => {
    expect(parseAgentCommand(`codex exec --model "gpt 5" 'prompt file.md'`)).toEqual(["codex", "exec", "--model", "gpt 5", "prompt file.md"]);
    expect(() => parseAgentCommand(`codex "unterminated`)).toThrow();
  });

  test("keeps store SKU offering-scoped and links offerings to canonical products", () => {
    const { production } = setup();
    production.upsertProduct("store", "sku-1", "hash-1", { summary: { name: "Samsung T7 1TB Blue" } });
    const offeringId = Number((production.listPendingEnrichmentOfferings()[0] as any).id);
    const productId = production.createCanonicalProduct({ name: "Samsung T7 1TB Blue", brand: "Samsung", model: "T7", variantIdentity: { capacity: "1TB", color: "blue" } });
    expect(() => production.addProductIdentifier({ canonicalProductId: productId, type: "sku", value: "store-123", confidence: 1 })).toThrow();
    production.addProductIdentifier({ canonicalProductId: productId, type: "mpn", value: "MU-PC1T0H", confidence: 1 });
    production.linkProductOffering({ productOfferingId: offeringId, canonicalProductId: productId, confidence: .99, reviewState: "accepted" });
    expect(production.listCanonicalProducts()).toHaveLength(1);
    production.close();
  });

  test("persists store-specific offering fields as first-class columns", () => {
    const { production } = setup();
    production.upsertProductOffering("store", "sku-1", "hash-1", {
      summary: { name: "Open Box SSD", price: 89, compareToPrice: 109, url: "https://example.com/ssd", imageUrl: "https://example.com/ssd.jpg", sku: "seller-1", inStock: true },
      product: { description: "Store description", currency: "EUR", condition: "open-box", shipping: { cost: 4.95 }, warranty: { months: 12 }, metadata: { source: "fixture" } }
    });
    const id = Number((production.listPendingEnrichmentOfferings()[0] as any).id);
    const row = production.productOfferingDetails(id) as any;
    expect(row).toMatchObject({ title: "Open Box SSD", description: "Store description", price: 89, currency: "EUR", url: "https://example.com/ssd", condition: "open-box", seller_sku: "seller-1", availability: "unknown" });
    expect(JSON.parse(row.images_json)).toEqual(["https://example.com/ssd.jpg"]);
    expect(JSON.parse(row.shipping_json)).toEqual({ cost: 4.95 });
    expect(JSON.parse(row.discount_json)).toEqual({ compareAtPrice: 109 });
    expect(JSON.parse(row.warranty_json)).toEqual({ months: 12 });
    expect(JSON.parse(row.synchronization_state_json)).toMatchObject({ sourceHash: "hash-1" });
    production.close();
  });

  test("exports a dedicated enrichment database with explicit write targets", () => {
    const { root, production } = setup();
    production.upsertProduct("store", "sku-1", "hash-1", { summary: { name: "SSD" } });
    const harness = new CommandEnrichmentAgentHarness({ command: ["true"], root: path.join(root, "runs") });
    const workspace = harness.prepare("run-1");
    harness.exportSourceData(workspace, production);
    expect(existsSync(workspace.databasePath)).toBe(true);
    const db = new Database(workspace.databasePath, { readonly: true });
    expect((db.query("SELECT COUNT(*) count FROM pending_product_offerings").get() as any).count).toBe(1);
    expect((db.query("SELECT COUNT(*) count FROM enrichment_contract WHERE writable = 1").get() as any).count).toBe(ENRICHMENT_RESULT_TABLES.length);
    expect(db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='products'").get()).toBeNull();
    db.close();
    expect(harness.validate(workspace)).toEqual([]);
    production.close();
  });

  test("exports deterministic extraction and lexical canonical candidates", () => {
    const { root, production } = setup();
    production.createCanonicalProduct({ name: "Samsung T7 1TB Blue", brand: "Samsung", model: "T7" });
    production.upsertProduct("store", "sku-1", "hash-1", { summary: { name: "Samsung T7 1000 GB Blue USB C Open Box" }, product: { description: "MPN: MU-PC1T0H" } });
    const harness = new CommandEnrichmentAgentHarness({ command: ["true"], root: path.join(root, "runs") });
    const workspace = harness.prepare("run-1");
    harness.exportSourceData(workspace, production);
    const db = new Database(workspace.databasePath, { readonly: true });
    expect((db.query("SELECT COUNT(*) count FROM deterministic_extraction_results").get() as any).count).toBeGreaterThanOrEqual(3);
    expect(db.query("SELECT 1 FROM deterministic_extraction_results WHERE name = 'capacity' AND normalized_value = '1 TB'").get()).not.toBeNull();
    expect(db.query("SELECT 1 FROM deterministic_extraction_results WHERE name = 'condition' AND normalized_value = 'open-box'").get()).not.toBeNull();
    expect((db.query("SELECT COUNT(*) count FROM embedding_candidate_matches").get() as any).count).toBe(1);
    db.close();
    production.close();
  });

  test("applies only accepted high-confidence existing canonical matches", () => {
    const { root, production } = setup();
    const productId = production.createCanonicalProduct({ name: "Samsung T7 1TB Blue", brand: "Samsung", model: "T7", reviewState: "accepted" });
    production.upsertProduct("store", "sku-1", "hash-1", { summary: { name: "Samsung T7 1TB Blue" } });
    const offeringId = Number((production.listPendingEnrichmentOfferings()[0] as any).id);
    const harness = new CommandEnrichmentAgentHarness({ command: ["true"], root: path.join(root, "runs") });
    const workspace = harness.prepare("run-1");
    harness.exportSourceData(workspace, production);
    const db = new Database(workspace.databasePath);
    db.query(`INSERT INTO canonical_product_match_proposals
      (enrichment_run_id, source_product_offering_id, target_entity_type, target_entity_id, proposed_value_json, confidence, evidence_json, review_state, created_at, agent_metadata_json)
      VALUES (?, ?, 'Product', ?, '{}', .99, '[]', 'accepted', ?, '{}')`).run("run-1", offeringId, productId, new Date().toISOString());
    db.close();
    expect(applyAcceptedProposals(workspace, production)).toEqual({ appliedCanonicalMatches: 1, createdCanonicalProducts: 0, appliedLabels: 0, appliedSpecifications: 0, appliedIdentifiers: 0, appliedCategories: 0, reviewRequired: 0, errors: [] });
    expect(applyAcceptedProposals(workspace, production)).toEqual({ appliedCanonicalMatches: 1, createdCanonicalProducts: 0, appliedLabels: 0, appliedSpecifications: 0, appliedIdentifiers: 0, appliedCategories: 0, reviewRequired: 0, errors: [] });
    expect((production.db.query("SELECT COUNT(*) count FROM product_offering_product_links").get() as any).count).toBe(1);
    production.close();
  });

  test("blocks forbidden source writes and detects duplicate taxonomy proposals", () => {
    const { root, production } = setup();
    production.upsertProduct("store", "sku-1", "hash-1", { summary: { name: "SSD" } });
    production.db.query("INSERT INTO labels (name, normalized_name, scope, created_at) VALUES ('Portable', 'portable', 'Product', ?)").run(new Date().toISOString());
    const harness = new CommandEnrichmentAgentHarness({ command: ["true"], root: path.join(root, "runs") });
    const workspace = harness.prepare("run-1");
    harness.exportSourceData(workspace, production);
    const db = new Database(workspace.databasePath);
    expect(() => db.query("UPDATE pending_product_offerings SET reason = 'tampered'").run()).toThrow(/read-only/);
    db.query(`INSERT INTO new_label_proposals
      (enrichment_run_id, source_product_offering_id, target_entity_type, proposed_value_json, normalized_proposed_value, confidence, created_at)
      VALUES ('run-1', 1, 'Label', '{}', 'portable', .9, ?)`).run(new Date().toISOString());
    db.close();
    const errors = harness.validate(workspace);
    expect(errors).toContain("new_label_proposals contains 1 existing labels");
    const audit = new Database(workspace.databasePath, { readonly: true });
    expect((audit.query("SELECT COUNT(*) count FROM validation_errors").get() as any).count).toBe(1);
    audit.close();
    production.close();
  });

  test("validates duplicate canonical products and missing category parents", () => {
    const { root, production } = setup();
    production.createCanonicalProduct({ name: "Samsung T7 1TB Blue", brand: "Samsung", model: "T7" });
    production.upsertProduct("store", "sku-1", "hash-1", { summary: { name: "Samsung T7 1TB Blue" } });
    const harness = new CommandEnrichmentAgentHarness({ command: ["true"], root: path.join(root, "runs") });
    const workspace = harness.prepare("run-validation");
    harness.exportSourceData(workspace, production);
    const db = new Database(workspace.databasePath);
    const now = new Date().toISOString();
    db.query(`INSERT INTO new_canonical_product_proposals
      (enrichment_run_id, source_product_offering_id, target_entity_type, proposed_value_json, normalized_proposed_value, confidence, created_at)
      VALUES ('run-validation', 1, 'Product', '{}', 'samsung t7 1tb blue', .9, ?)`).run(now);
    db.query(`INSERT INTO new_category_proposals
      (enrichment_run_id, source_product_offering_id, target_entity_type, proposed_value_json, confidence, created_at)
      VALUES ('run-validation', 1, 'Category', ?, .9, ?)`).run(JSON.stringify({ name: "External SSDs", fullPath: "Electronics > Storage > External SSDs", parentId: 999 }), now);
    db.close();
    const errors = harness.validate(workspace);
    expect(errors).toContain("new_canonical_product_proposals contains 1 existing canonical products");
    expect(errors).toContain("new_category_proposals:1 references missing parent 999");
    production.close();
  });

  test("lists proposals and updates review state through constrained helpers", () => {
    const { root, production } = setup();
    production.upsertProduct("store", "sku-1", "hash-1", { summary: { name: "SSD" } });
    const harness = new CommandEnrichmentAgentHarness({ command: ["true"], root: path.join(root, "runs") });
    const workspace = harness.prepare("run-1");
    harness.exportSourceData(workspace, production);
    const db = new Database(workspace.databasePath);
    const id = Number(db.query(`INSERT INTO review_flags
      (enrichment_run_id, source_product_offering_id, target_entity_type, proposed_value_json, confidence, created_at)
      VALUES ('run-1', 1, 'ProductOffering', '{}', .5, ?)`).run(new Date().toISOString()).lastInsertRowid);
    db.close();
    expect(setProposalReviewState(workspace, "review_flags", id, "accepted")).toBe(true);
    const reviewFlags = listEnrichmentProposals(workspace).review_flags!;
    expect((reviewFlags[0]! as any).review_state).toBe("accepted");
    expect(() => setProposalReviewState(workspace, "pending_product_offerings", 1, "accepted")).toThrow();
    production.close();
  });

  test("applies accepted new products, scoped labels, specifications, and identifiers", () => {
    const { root, production } = setup();
    production.upsertProduct("store", "sku-1", "hash-1", { summary: { name: "Samsung T7 1TB Blue" } });
    const offeringId = Number((production.listPendingEnrichmentOfferings()[0] as any).id);
    const harness = new CommandEnrichmentAgentHarness({ command: ["true"], root: path.join(root, "runs") });
    const workspace = harness.prepare("run-1");
    harness.exportSourceData(workspace, production);
    const db = new Database(workspace.databasePath);
    const insert = (table: string, target: number | null, value: unknown, normalized: string | null = null) => db.query(`INSERT INTO ${table}
      (enrichment_run_id, source_product_offering_id, target_entity_type, target_entity_id, proposed_value_json, normalized_proposed_value, confidence, evidence_json, review_state, created_at, agent_metadata_json)
      VALUES ('run-1', ?, 'test', ?, ?, ?, .99, '[]', 'accepted', ?, '{}')`).run(offeringId, target, JSON.stringify(value), normalized, new Date().toISOString());
    insert("new_canonical_product_proposals", null, { name: "Samsung T7 1TB Blue", brand: "Samsung", model: "T7", variantIdentity: { capacity: "1TB", color: "blue" } });
    insert("product_offering_label_proposals", null, { name: "Open Box" });
    insert("specification_extraction_proposals", null, { scope: "ProductOffering", name: "condition", value: "open box" }, "open box");
    insert("identifier_extraction_proposals", null, { scope: "ProductOffering", type: "seller_sku", value: "sku-1" }, "SKU1");
    db.close();
    const result = applyAcceptedProposals(workspace, production);
    expect(result).toEqual({ appliedCanonicalMatches: 0, createdCanonicalProducts: 1, appliedLabels: 1, appliedSpecifications: 1, appliedIdentifiers: 1, appliedCategories: 0, reviewRequired: 0, errors: [] });
    expect(applyAcceptedProposals(workspace, production)).toEqual({ appliedCanonicalMatches: 0, createdCanonicalProducts: 0, appliedLabels: 0, appliedSpecifications: 0, appliedIdentifiers: 0, appliedCategories: 0, reviewRequired: 0, errors: [] });
    expect((production.db.query("SELECT COUNT(*) count FROM canonical_products").get() as any).count).toBe(1);
    expect((production.db.query("SELECT COUNT(*) count FROM product_offering_labels").get() as any).count).toBe(1);
    expect((production.db.query("SELECT COUNT(*) count FROM product_offering_specifications").get() as any).count).toBe(1);
    production.close();
  });

  test("applies accepted standalone labels and generic offering enrichment", () => {
    const { root, production } = setup();
    production.upsertProduct("store", "sku-1", "hash-1", { summary: { name: "Open Box SSD" } });
    const offeringId = Number((production.listPendingEnrichmentOfferings()[0] as any).id);
    const harness = new CommandEnrichmentAgentHarness({ command: ["true"], root: path.join(root, "runs") });
    const workspace = harness.prepare("run-generic");
    harness.exportSourceData(workspace, production);
    const db = new Database(workspace.databasePath);
    const now = new Date().toISOString();
    db.query(`INSERT INTO new_label_proposals
      (enrichment_run_id, source_product_offering_id, target_entity_type, proposed_value_json, normalized_proposed_value, confidence, review_state, created_at)
      VALUES ('run-generic', ?, 'Label', ?, 'open box', .99, 'accepted', ?)`).run(offeringId, JSON.stringify({ name: "Open Box", scope: "ProductOffering" }), now);
    db.query(`INSERT INTO product_offering_enrichment_proposals
      (enrichment_run_id, source_product_offering_id, target_entity_type, proposed_value_json, normalized_proposed_value, confidence, review_state, created_at)
      VALUES ('run-generic', ?, 'ProductOffering', ?, 'open-box', .99, 'accepted', ?)`).run(offeringId, JSON.stringify({ field: "condition", value: "Open Box" }), now);
    db.close();
    const result = applyAcceptedProposals(workspace, production);
    expect(result.appliedLabels).toBe(1);
    expect(result.appliedSpecifications).toBe(1);
    expect((production.db.query("SELECT COUNT(*) count FROM labels").get() as any).count).toBe(1);
    expect((production.db.query("SELECT COUNT(*) count FROM product_offering_specifications").get() as any).count).toBe(1);
    production.close();
  });

  test("reports malformed proposal JSON without aborting valid proposal application", () => {
    const { root, production } = setup();
    production.upsertProduct("store", "sku-1", "hash-1", { summary: { name: "SSD" } });
    const offeringId = Number((production.listPendingEnrichmentOfferings()[0] as any).id);
    const harness = new CommandEnrichmentAgentHarness({ command: ["true"], root: path.join(root, "runs") });
    const workspace = harness.prepare("run-malformed");
    harness.exportSourceData(workspace, production);
    const db = new Database(workspace.databasePath);
    const now = new Date().toISOString();
    db.query(`INSERT INTO new_label_proposals
      (enrichment_run_id, source_product_offering_id, target_entity_type, proposed_value_json, confidence, review_state, created_at)
      VALUES ('run-malformed', ?, 'Label', '{bad', .9, 'accepted', ?)`).run(offeringId, now);
    db.query(`INSERT INTO product_offering_enrichment_proposals
      (enrichment_run_id, source_product_offering_id, target_entity_type, proposed_value_json, confidence, review_state, created_at)
      VALUES ('run-malformed', ?, 'ProductOffering', ?, .9, 'accepted', ?)`).run(offeringId, JSON.stringify({ field: "condition", value: "new" }), now);
    db.close();
    expect(harness.validate(workspace)).toContain("new_label_proposals:1 contains invalid proposed_value_json");
    const result = applyAcceptedProposals(workspace, production);
    expect(result.errors).toContain("new_label_proposals:1 contains invalid JSON");
    expect(result.appliedSpecifications).toBe(1);
    production.close();
  });

  test("returns canonical details with accepted cross-store offerings", () => {
    const { production } = setup();
    production.upsertProduct("store-a", "a-1", "hash-a", { summary: { name: "Samsung T7 1TB Blue", price: 100 } });
    production.upsertProduct("store-b", "b-1", "hash-b", { summary: { name: "Samsung T7 1TB Blue", price: 90 } });
    const offerings = production.listPendingEnrichmentOfferings() as any[];
    const productId = production.createCanonicalProduct({ name: "Samsung T7 1TB Blue", brand: "Samsung", model: "T7", reviewState: "accepted" });
    for (const offering of offerings) production.linkProductOffering({ productOfferingId: Number(offering.id), canonicalProductId: productId, confidence: .99, reviewState: "accepted" });
    const list = production.listProductOfferings();
    expect(list.every((offering) => offering.canonicalProductId === productId)).toBe(true);
    const details = production.canonicalProductDetails(productId) as any;
    expect(details.offerings).toHaveLength(2);
    expect(details.offerings.map((offering: any) => offering.offering_summary.price).sort((a: number, b: number) => a - b)).toEqual([90, 100]);
    expect(production.productOfferingDetails(Number(offerings[0].id))).not.toBeNull();
    production.close();
  });

  test("creates and assigns accepted categories idempotently", () => {
    const { root, production } = setup();
    production.upsertProduct("store", "sku-1", "hash-1", { summary: { name: "SSD" } });
    const offeringId = Number((production.listPendingEnrichmentOfferings()[0] as any).id);
    const harness = new CommandEnrichmentAgentHarness({ command: ["true"], root: path.join(root, "runs") });
    const workspace = harness.prepare("run-1");
    harness.exportSourceData(workspace, production);
    const db = new Database(workspace.databasePath);
    db.query(`INSERT INTO new_category_proposals
      (enrichment_run_id, source_product_offering_id, target_entity_type, proposed_value_json, normalized_proposed_value, confidence, review_state, created_at)
      VALUES ('run-1', ?, 'Category', ?, 'electronics > storage > external ssds', .99, 'accepted', ?)`)
      .run(offeringId, JSON.stringify({ name: "External SSDs", fullPath: "Electronics > Storage > External SSDs" }), new Date().toISOString());
    db.close();
    const first = applyAcceptedProposals(workspace, production);
    expect(first.appliedCategories).toBe(1);
    expect((production.db.query("SELECT COUNT(*) count FROM categories").get() as any).count).toBe(3);
    expect(production.db.query("SELECT 1 FROM categories WHERE normalized_path = 'electronics > storage > external ssds'").get()).not.toBeNull();
    expect(applyAcceptedProposals(workspace, production).appliedCategories).toBe(0);
    production.close();
  });

  test("reuses canonical products with the same normalized sellable identity", () => {
    const { production } = setup();
    const first = production.createCanonicalProduct({ name: "Samsung T7 1TB Blue", brand: "Samsung", model: "T7", variantIdentity: { capacity: "1TB", color: "blue" } });
    const second = production.createCanonicalProduct({ name: " Samsung   T7 1TB Blue ", brand: "Samsung", model: "T7", variantIdentity: { capacity: "1TB", color: "blue" } });
    const third = production.createCanonicalProduct({ name: "Samsung T7 2TB Blue", brand: "Samsung", model: "T7", variantIdentity: { capacity: "2TB", color: "blue" } });
    expect(second).toBe(first);
    expect(third).not.toBe(first);
    expect(production.listCanonicalProducts()).toHaveLength(2);
    production.close();
  });

  test("generates and exports embedding-based candidates through a provider abstraction", async () => {
    const { root, production } = setup();
    production.createCanonicalProduct({ name: "Samsung T7 1TB Blue", brand: "Samsung", model: "T7" });
    production.createCanonicalProduct({ name: "Coffee Machine", brand: "Example", model: "C1" });
    production.upsertProduct("store", "sku-1", "hash-1", { summary: { name: "Samsung T7 1TB Blue" } });
    let calls = 0;
    const provider = {
      name: "fake",
      model: "fake-v1",
      async embed(texts: string[]) {
        calls++;
        return texts.map((text) => text.toLowerCase().includes("samsung") ? [1, 0] : [0, 1]);
      }
    };
    expect(await updateEmbeddingsAndCandidates(production, provider, .9)).toBe(1);
    expect(calls).toBe(2);
    expect(await updateEmbeddingsAndCandidates(production, provider, .9)).toBe(1);
    expect(calls).toBe(2);
    const harness = new CommandEnrichmentAgentHarness({ command: ["true"], root: path.join(root, "runs") });
    const workspace = harness.prepare("run-1");
    harness.exportSourceData(workspace, production);
    const db = new Database(workspace.databasePath, { readonly: true });
    expect((db.query("SELECT COUNT(*) count FROM product_offering_embeddings").get() as any).count).toBe(1);
    expect((db.query("SELECT COUNT(*) count FROM canonical_product_embeddings").get() as any).count).toBe(2);
    expect((db.query("SELECT COUNT(*) count FROM embedding_candidate_matches WHERE score >= .9").get() as any).count).toBe(1);
    db.close();
    production.close();
  });

  test("exports taxonomy candidates, similar offerings, and prior accepted decisions", () => {
    const { root, production } = setup();
    production.upsertProduct("store-a", "a", "hash-a", { summary: { name: "Portable External SSD Blue" } });
    production.upsertProduct("store-b", "b", "hash-b", { summary: { name: "Portable External SSD Blue Open Box" } });
    const offerings = production.listPendingEnrichmentOfferings() as any[];
    const categoryId = production.createOrReuseCategory({ name: "External SSDs", fullPath: "Electronics > Storage > External SSDs" });
    production.createOrReuseLabel({ name: "Portable", scope: "Product" });
    const productId = production.createCanonicalProduct({ name: "Portable External SSD Blue", categoryId, reviewState: "accepted" });
    production.linkProductOffering({ productOfferingId: Number(offerings[0].id), canonicalProductId: productId, confidence: .99, reviewState: "accepted" });
    const harness = new CommandEnrichmentAgentHarness({ command: ["true"], root: path.join(root, "runs") });
    const workspace = harness.prepare("run-context");
    harness.exportSourceData(workspace, production);
    const db = new Database(workspace.databasePath, { readonly: true });
    expect((db.query("SELECT COUNT(*) count FROM category_candidate_matches").get() as any).count).toBeGreaterThan(0);
    expect((db.query("SELECT COUNT(*) count FROM label_candidate_matches").get() as any).count).toBeGreaterThan(0);
    expect((db.query("SELECT COUNT(*) count FROM similar_product_offerings").get() as any).count).toBe(2);
    expect((db.query("SELECT COUNT(*) count FROM prior_enrichment_decisions").get() as any).count).toBe(1);
    db.close();
    production.close();
  });

  test("server prepares enrichment run artifacts without executing an agent", async () => {
    const { production } = setup();
    production.upsertProduct("store", "sku-1", "hash-1", { summary: { name: "SSD" } });
    const server = createServer({ port: 0, database: production });
    try {
      const response = await fetch(new URL("/api/enrichment/runs", server.url), {
        method: "POST",
        body: JSON.stringify({ runId: "run-api" })
      });
      expect(response.status).toBe(201);
      const body = await response.json() as any;
      expect(body.runId).toBe("run-api");
      expect(body.embeddingCandidates).toBe(0);
      expect(body.validationErrors).toEqual([]);
      expect(production.listEnrichmentRuns()[0]?.id).toBe("run-api");
      expect(existsSync(body.databasePath)).toBe(true);
      expect((await fetch(new URL("/api/enrichment/runs/run-api", server.url), { method: "DELETE" })).status).toBe(200);
      expect(existsSync(body.databasePath)).toBe(false);
    } finally {
      server.stop(true);
      production.close();
    }
  });

  test("server lists proposals, updates review state, and applies accepted proposals", async () => {
    const { production } = setup();
    const productId = production.createCanonicalProduct({ name: "Samsung T7 1TB Blue", brand: "Samsung", model: "T7", reviewState: "accepted" });
    production.upsertProduct("store", "sku-1", "hash-1", { summary: { name: "Samsung T7 1TB Blue" } });
    const offeringId = Number((production.listPendingEnrichmentOfferings()[0] as any).id);
    const server = createServer({ port: 0, database: production });
    try {
      const created = await (await fetch(new URL("/api/enrichment/runs", server.url), {
        method: "POST",
        body: JSON.stringify({ runId: "run-review" })
      })).json() as any;
      const db = new Database(created.databasePath);
      const proposalId = Number(db.query(`INSERT INTO canonical_product_match_proposals
        (enrichment_run_id, source_product_offering_id, target_entity_type, target_entity_id, proposed_value_json, confidence, evidence_json, review_state, created_at, agent_metadata_json)
        VALUES ('run-review', ?, 'Product', ?, '{}', .99, '[]', 'pending', ?, '{}')`).run(offeringId, productId, new Date().toISOString()).lastInsertRowid);
      db.close();
      const proposals = await (await fetch(new URL("/api/enrichment/runs/run-review/proposals", server.url))).json() as any;
      expect(proposals.canonical_product_match_proposals).toHaveLength(1);
      const update = await fetch(new URL("/api/enrichment/runs/run-review/proposals", server.url), {
        method: "POST",
        body: JSON.stringify({ table: "canonical_product_match_proposals", id: proposalId, reviewState: "accepted" })
      });
      expect(update.status).toBe(200);
      const apply = await (await fetch(new URL("/api/enrichment/runs/run-review/apply", server.url), { method: "POST" })).json() as any;
      expect(apply.appliedCanonicalMatches).toBe(1);
      expect((production.db.query("SELECT COUNT(*) count FROM product_offering_product_links").get() as any).count).toBe(1);
    } finally {
      server.stop(true);
      production.close();
    }
  });
});
