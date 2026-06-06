import { mkdir, readdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { stableStringify, sha256Text } from "./canonical-json.ts";
import { loadConfig } from "./config.ts";
import { createdEvent, deletedEvent, eventJsonl, eventRunDigest, fieldChangedEvents } from "./events.ts";
import { gitOutput, gitSuccess, runGit } from "./git.ts";
import { diffJson } from "./json-diff.ts";
import { safePathSegment } from "./safe-id.ts";
import { productsHashFromRecords, writeResolvedStoreState } from "./state.ts";
import type { AppConfig, JsonObject, ProductEvent, ProductMutationBatch, ProductMutationOperation, ProductSnapshotRecord, StoreConfig, StoreSyncSummary } from "./types.ts";

export interface ProductMutationApplyArgs {
  configPath: string;
  cwd: string;
  requestPaths: string[];
  noPush: boolean;
}

export interface ProductMutationApplySummary {
  requestId: string;
  storeId: string;
  branch: string;
  created: number;
  updated: number;
  deleted: number;
  fieldEvents: number;
  eventFile?: string;
  productsHash: string;
  committed: boolean;
}

interface StoreBranchManifest {
  schemaVersion: 2;
  source: "ecwid";
  storeId: string;
  storeName: string | null;
  productCount: number;
  productsHash: string;
  lastSyncedAt: string;
  lastChangedAt: string | null;
  lastRunId: string;
  lastEventFile: string | null;
  syncIntervalMinutes: number;
  nextSyncNotBefore: string;
  lastMutationRequestId?: string;
  lastMutatedAt?: string;
}

function assertObject(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${label} must be a non-empty string`);
  return value.trim();
}

function optionalString(value: unknown, label: string): string | undefined {
  if (typeof value === "undefined") return undefined;
  if (typeof value !== "string") throw new Error(`${label} must be a string`);
  return value;
}

function optionalBoolean(value: unknown, label: string): boolean | undefined {
  if (typeof value === "undefined") return undefined;
  if (typeof value !== "boolean") throw new Error(`${label} must be a boolean`);
  return value;
}

function assertProduct(value: unknown, label: string): JsonObject {
  assertObject(value, label);
  const id = value.id;
  if (typeof id !== "string" && typeof id !== "number") throw new Error(`${label}.id must be a string or number`);
  return value as JsonObject;
}

function productIdFromProduct(product: JsonObject, label: string): string {
  const id = product.id;
  if (typeof id !== "string" && typeof id !== "number") throw new Error(`${label}.id must be a string or number`);
  return String(id);
}

function parseOperation(value: unknown, index: number): ProductMutationOperation {
  const label = `operations[${index}]`;
  assertObject(value, label);
  const op = requiredString(value.op, `${label}.op`);
  const expectHash = optionalString(value.expectHash, `${label}.expectHash`);
  if (op === "upsert") {
    const product = assertProduct(value.product, `${label}.product`);
    const productId = optionalString(value.productId, `${label}.productId`);
    const inferredProductId = productIdFromProduct(product, `${label}.product`);
    if (productId && productId !== inferredProductId) throw new Error(`${label}.productId does not match ${label}.product.id`);
    return { op, productId: productId ?? inferredProductId, product, expectHash };
  }
  if (op === "delete") return { op, productId: requiredString(value.productId, `${label}.productId`), expectHash };
  throw new Error(`${label}.op must be "upsert" or "delete"`);
}

export function parseProductMutationBatch(raw: unknown): ProductMutationBatch {
  assertObject(raw, "request");
  const schemaVersion = raw.schemaVersion;
  if (schemaVersion !== 1) throw new Error("request.schemaVersion must be 1");
  const kind = requiredString(raw.kind, "request.kind");
  if (kind !== "ecwid-product-mutation-batch") throw new Error('request.kind must be "ecwid-product-mutation-batch"');
  const storeId = requiredString(raw.storeId, "request.storeId");
  const requestId = requiredString(raw.requestId, "request.requestId");
  const requestedAt = requiredString(raw.requestedAt, "request.requestedAt");
  if (Number.isNaN(new Date(requestedAt).valueOf())) throw new Error("request.requestedAt must be an ISO date string");
  if (!Array.isArray(raw.operations) || raw.operations.length === 0) throw new Error("request.operations must be a non-empty array");
  if (raw.operations.length > 500) throw new Error("request.operations must contain at most 500 operations");
  const operations = raw.operations.map(parseOperation);
  const seen = new Set<string>();
  for (const operation of operations) {
    if (seen.has(operation.productId)) throw new Error(`request.operations contains duplicate product id ${operation.productId}`);
    seen.add(operation.productId);
  }
  return {
    schemaVersion: 1,
    kind,
    source: optionalString(raw.source, "request.source") ?? "web-ui",
    requestId,
    storeId,
    requestedAt,
    requestedBy: optionalString(raw.requestedBy, "request.requestedBy"),
    baseProductsHash: optionalString(raw.baseProductsHash, "request.baseProductsHash"),
    allowOutdatedBase: optionalBoolean(raw.allowOutdatedBase, "request.allowOutdatedBase"),
    note: optionalString(raw.note, "request.note"),
    operations
  };
}

function isoNoMillis(date = new Date()): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function setupGitIdentity(cwd: string): void {
  const name = runGit(["config", "--get", "user.name"], { cwd, quiet: true, allowFailure: true }).stdout.trim();
  const email = runGit(["config", "--get", "user.email"], { cwd, quiet: true, allowFailure: true }).stdout.trim();
  if (!name) runGit(["config", "user.name", "github-actions[bot]"], { cwd, quiet: true });
  if (!email) runGit(["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"], { cwd, quiet: true });
}

function branchExists(repoRoot: string, branch: string): boolean {
  if (gitSuccess(["show-ref", "--verify", `refs/heads/${branch}`], repoRoot)) return true;
  return gitSuccess(["show-ref", "--verify", `refs/remotes/origin/${branch}`], repoRoot);
}

async function createOrOpenStoreWorktree(repoRoot: string, worktreeDir: string, branch: string, store: StoreConfig): Promise<void> {
  await rm(worktreeDir, { recursive: true, force: true });
  runGit(["fetch", "origin", `+refs/heads/${branch}:refs/remotes/origin/${branch}`], { cwd: repoRoot, quiet: true, allowFailure: true });

  if (branchExists(repoRoot, branch)) {
    if (gitSuccess(["show-ref", "--verify", `refs/remotes/origin/${branch}`], repoRoot)) {
      runGit(["worktree", "add", "-B", branch, worktreeDir, `origin/${branch}`], { cwd: repoRoot, quiet: true });
    } else {
      runGit(["worktree", "add", worktreeDir, branch], { cwd: repoRoot, quiet: true });
    }
    return;
  }

  const head = gitOutput(["rev-parse", "HEAD"], repoRoot);
  runGit(["worktree", "add", "--detach", worktreeDir, head], { cwd: repoRoot, quiet: true });
  runGit(["switch", "--orphan", branch], { cwd: worktreeDir, quiet: true });
  runGit(["rm", "-rf", "."], { cwd: worktreeDir, quiet: true, allowFailure: true });
  await writeFile(path.join(worktreeDir, "README.md"), `# Ecwid store ${store.id}\n\nOrphan branch containing product snapshots, resolved state indexes, and append-only event streams for this store.\n`, "utf8");
}

async function readExistingProducts(productsDir: string): Promise<Map<string, ProductSnapshotRecord>> {
  const records = new Map<string, ProductSnapshotRecord>();
  let entries: string[] = [];
  try {
    entries = await readdir(productsDir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return records;
    throw error;
  }
  for (const entry of entries.sort()) {
    if (!entry.endsWith(".json")) continue;
    const filePath = path.join(productsDir, entry);
    const product = JSON.parse(await readFile(filePath, "utf8")) as JsonObject;
    const idValue = product.id;
    const productId = typeof idValue === "string" || typeof idValue === "number" ? String(idValue) : entry.replace(/\.json$/, "");
    const canonical = stableStringify(product);
    records.set(productId, { productId, filePath, product, canonical, hash: sha256Text(canonical) });
  }
  return records;
}

async function readManifest(worktreeDir: string): Promise<StoreBranchManifest | null> {
  try {
    return JSON.parse(await readFile(path.join(worktreeDir, "store.json"), "utf8")) as StoreBranchManifest;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function intervalMinutes(config: AppConfig, store: StoreConfig): number {
  return Math.max(1, Math.floor(store.syncIntervalMinutes ?? config.defaultSyncIntervalMinutes ?? 30));
}

function nextSyncNotBefore(manifest: StoreBranchManifest | null, observedAt: string, interval: number): string {
  const anchor = manifest?.lastSyncedAt ?? observedAt;
  const date = new Date(anchor);
  const base = Number.isNaN(date.valueOf()) ? new Date(observedAt) : date;
  return isoNoMillis(new Date(base.valueOf() + interval * 60_000));
}

function assertExpectedHash(operation: ProductMutationOperation, current: ProductSnapshotRecord | undefined): void {
  if (!operation.expectHash) return;
  if (!current) throw new Error(`${operation.op} ${operation.productId} expected hash ${operation.expectHash}, but product does not exist`);
  if (current.hash !== operation.expectHash) throw new Error(`${operation.op} ${operation.productId} expected hash ${operation.expectHash}, current hash is ${current.hash}`);
}

async function applyBatchToStore(config: AppConfig, store: StoreConfig, repoRoot: string, request: ProductMutationBatch, noPush: boolean): Promise<ProductMutationApplySummary> {
  const branch = `${config.storeBranchPrefix ?? "stores/ecwid"}/${safePathSegment(store.id)}`;
  const worktreeDir = path.join(repoRoot, ".ecwid-sync", "mutation-worktrees", safePathSegment(store.id));
  await mkdir(path.dirname(worktreeDir), { recursive: true });
  await createOrOpenStoreWorktree(repoRoot, worktreeDir, branch, store);

  try {
    const observedAt = isoNoMillis();
    const runId = `${observedAt.replaceAll(/[-:]/g, "").replace("T", "-").replace("Z", "Z")}-mutation-${safePathSegment(request.requestId).slice(0, 40)}`;
    const productsDir = path.join(worktreeDir, "products");
    await mkdir(productsDir, { recursive: true });
    const manifest = await readManifest(worktreeDir);
    const existing = await readExistingProducts(productsDir);
    const beforeProductsHash = productsHashFromRecords([...existing.values()].map((record) => ({ productId: record.productId, hash: record.hash })));
    if (request.baseProductsHash && !request.allowOutdatedBase && request.baseProductsHash !== beforeProductsHash) {
      throw new Error(`request ${request.requestId} was based on productsHash ${request.baseProductsHash}, but current ${branch} has ${beforeProductsHash}`);
    }

    const next = new Map(existing);
    const events: ProductEvent[] = [];
    let created = 0;
    let updated = 0;
    let deleted = 0;
    let fieldEvents = 0;

    for (const operation of request.operations) {
      const current = next.get(operation.productId);
      assertExpectedHash(operation, current);

      if (operation.op === "delete") {
        if (!current) throw new Error(`cannot delete ${operation.productId}: product does not exist on ${branch}`);
        await unlink(current.filePath);
        next.delete(operation.productId);
        events.push(deletedEvent({ storeId: store.id, productId: operation.productId, runId, observedAt }, current.product, current.hash));
        deleted += 1;
        continue;
      }

      const product = operation.product;
      const productId = productIdFromProduct(product, `upsert ${operation.productId}.product`);
      const filePath = path.join(productsDir, `${safePathSegment(productId)}.json`);
      const canonical = stableStringify(product);
      const hash = sha256Text(canonical);
      if (!current) {
        await writeFile(filePath, canonical, "utf8");
        next.set(productId, { productId, filePath, product, canonical, hash });
        events.push(createdEvent({ storeId: store.id, productId, runId, observedAt }, product, hash));
        created += 1;
      } else if (current.hash !== hash) {
        await writeFile(filePath, canonical, "utf8");
        next.set(productId, { productId, filePath, product, canonical, hash });
        const productEvents = fieldChangedEvents({ storeId: store.id, productId, runId, observedAt }, diffJson(current.product, product), current.hash, hash);
        events.push(...productEvents);
        updated += 1;
        fieldEvents += productEvents.length;
      }
    }

    const nextRecords = [...next.values()].sort((a, b) => a.productId.localeCompare(b.productId));
    const productsHash = productsHashFromRecords(nextRecords.map((record) => ({ productId: record.productId, hash: record.hash })));
    let eventFile: string | undefined;
    if (events.length > 0) {
      const digest = eventRunDigest(events);
      const dayPath = observedAt.slice(0, 10).replaceAll("-", "/");
      const eventDir = path.join(worktreeDir, "events", dayPath);
      eventFile = `events/${dayPath}/${digest}.jsonl`;
      await mkdir(eventDir, { recursive: true });
      await writeFile(path.join(eventDir, `${digest}.jsonl`), eventJsonl(events), "utf8");
    }

    const interval = intervalMinutes(config, store);
    const summary: StoreSyncSummary = { storeId: store.id, fetched: nextRecords.length, created, updated, deleted, fieldEvents, eventFile, productsHash };
    await writeFile(path.join(worktreeDir, "config.json"), stableStringify({ ...store, token: undefined } as never), "utf8");
    await writeResolvedStoreState({ worktreeDir, store, observedAt, fetchedProducts: nextRecords.map((record) => record.product), events, eventFile, summary });
    const branchManifest: StoreBranchManifest = {
      schemaVersion: 2,
      source: "ecwid",
      storeId: store.id,
      storeName: store.name ?? null,
      productCount: nextRecords.length,
      productsHash,
      lastSyncedAt: manifest?.lastSyncedAt ?? observedAt,
      lastChangedAt: events.length > 0 ? observedAt : manifest?.lastChangedAt ?? null,
      lastRunId: runId,
      lastEventFile: eventFile ?? manifest?.lastEventFile ?? null,
      syncIntervalMinutes: interval,
      nextSyncNotBefore: nextSyncNotBefore(manifest, observedAt, interval),
      lastMutationRequestId: request.requestId,
      lastMutatedAt: observedAt
    };
    await writeFile(path.join(worktreeDir, "store.json"), stableStringify(branchManifest as never), "utf8");
    await writeFile(path.join(worktreeDir, "README.md"), `# Ecwid store ${store.id}\n\nOrphan branch containing product snapshots, resolved state indexes, and append-only event streams for this store.\n`, "utf8");

    setupGitIdentity(worktreeDir);
    runGit(["add", "README.md", "config.json", "store.json", "products", "events", "state"], { cwd: worktreeDir, quiet: true, allowFailure: true });
    let committed = false;
    if (gitSuccess(["diff", "--cached", "--quiet"], worktreeDir)) {
      console.log(`mutation ${request.requestId}: no product-state changes for store ${store.id}`);
    } else {
      const msg = events.length > 0
        ? `products(ecwid:${store.id}): apply ${request.requestId} (${created} created, ${updated} updated, ${deleted} deleted)`
        : `products(ecwid:${store.id}): refresh state for ${request.requestId}`;
      runGit(["commit", "--quiet", "-m", msg], { cwd: worktreeDir });
      committed = true;
      if (!noPush) runGit(["push", "origin", `HEAD:${branch}`], { cwd: worktreeDir });
    }

    return { requestId: request.requestId, storeId: store.id, branch, created, updated, deleted, fieldEvents, eventFile, productsHash, committed };
  } finally {
    await rm(worktreeDir, { recursive: true, force: true });
    runGit(["worktree", "prune"], { cwd: repoRoot, quiet: true, allowFailure: true });
  }
}

export async function applyProductMutationRequests(args: ProductMutationApplyArgs): Promise<ProductMutationApplySummary[]> {
  if (args.requestPaths.length === 0) throw new Error("At least one --request path is required");
  const config = await loadConfig(path.resolve(args.cwd, args.configPath));
  const summaries: ProductMutationApplySummary[] = [];
  for (const requestPath of args.requestPaths) {
    const absoluteRequestPath = path.resolve(args.cwd, requestPath);
    const request = parseProductMutationBatch(JSON.parse(await readFile(absoluteRequestPath, "utf8")));
    const store = config.stores.find((candidate) => candidate.id === request.storeId);
    if (!store) throw new Error(`request ${request.requestId} refers to unknown store ${request.storeId}`);
    summaries.push(await applyBatchToStore(config, store, args.cwd, request, args.noPush));
  }
  return summaries;
}
