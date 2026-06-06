#!/usr/bin/env bun
import { mkdir, readdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { stableStringify, sha256Text } from "./canonical-json.ts";
import { loadConfig } from "./config.ts";
import { fetchAllProducts, type FetchAllProductsOptions } from "./ecwid.ts";
import { createdEvent, deletedEvent, eventJsonl, eventRunDigest, fieldChangedEvents } from "./events.ts";
import { runGit, gitOutput, gitSuccess } from "./git.ts";
import { diffJson } from "./json-diff.ts";
import { safePathSegment } from "./safe-id.ts";
import { productsHashFromRecords, writeResolvedStoreState } from "./state.ts";
import type { AppConfig, JsonObject, ProductEvent, ProductSnapshotRecord, StoreConfig, StoreSyncSummary, SyncSummary } from "./types.ts";

interface Args {
  configPath: string;
  cwd: string;
  noPush: boolean;
  dueOnly: boolean;
  force: boolean;
  storeIds: string[];
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
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    configPath: "config/ecwid-stores.json",
    cwd: process.cwd(),
    noPush: false,
    dueOnly: false,
    force: false,
    storeIds: []
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--config") args.configPath = required(argv[++i], arg);
    else if (arg === "--cwd") args.cwd = path.resolve(required(argv[++i], arg));
    else if (arg === "--store") args.storeIds.push(required(argv[++i], arg));
    else if (arg === "--no-push") args.noPush = true;
    else if (arg === "--due-only") args.dueOnly = true;
    else if (arg === "--force") args.force = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function required(value: string | undefined, flag: string): string {
  if (!value) throw new Error(`${flag} requires a value`);
  return value;
}

function isoNoMillis(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function productId(product: JsonObject, storeId: string): string {
  const id = product.id;
  if (typeof id !== "string" && typeof id !== "number") throw new Error(`Product in store ${storeId} is missing string/number id`);
  return String(id);
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
  await writeFile(path.join(worktreeDir, "README.md"), `# Ecwid store ${store.id}\n\nOrphan branch containing product snapshots, store manifest, and append-only event streams for this store.\n`, "utf8");
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
    const id = typeof idValue === "string" || typeof idValue === "number" ? String(idValue) : entry.replace(/\.json$/, "");
    const canonical = stableStringify(product);
    records.set(id, { productId: id, filePath, product, canonical, hash: sha256Text(canonical) });
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

function dueAt(lastSyncedAt: string | null | undefined, interval: number): Date | null {
  if (!lastSyncedAt) return null;
  const last = new Date(lastSyncedAt);
  if (Number.isNaN(last.valueOf())) return null;
  return new Date(last.valueOf() + interval * 60_000);
}

async function dispatchWebhooks(store: StoreConfig, events: ProductEvent[], summary: StoreSyncSummary): Promise<void> {
  const hooks = (store.webhooks ?? []).filter((hook) => hook.enabled !== false);
  if (hooks.length === 0 || events.length === 0) return;
  for (const hook of hooks) {
    const wanted = new Set(hook.events ?? ["*"]);
    const selected = wanted.has("*" as never) ? events : events.filter((event) => wanted.has(event.eventType));
    if (selected.length === 0) continue;
    const body = stableStringify({ schemaVersion: 1, source: "ecwid-product-git-watch", storeId: store.id, summary, events: selected } as never);
    const headers: Record<string, string> = { "content-type": "application/json", ...(hook.headers ?? {}) };
    const secret = hook.secretEnv ? process.env[hook.secretEnv] : undefined;
    if (secret) {
      const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
      headers["x-ecwid-watch-signature-256"] = `sha256=${Buffer.from(sig).toString("hex")}`;
    }
    const response = await fetch(hook.url, { method: "POST", headers, body });
    if (!response.ok) throw new Error(`Webhook ${hook.id} failed: ${response.status} ${response.statusText}`);
  }
}

async function syncInStoreBranch(config: AppConfig, store: StoreConfig, repoRoot: string, observedAt: string, runId: string, args: Args, options: FetchAllProductsOptions = {}): Promise<StoreSyncSummary | null> {
  const branch = `${config.storeBranchPrefix ?? "stores/ecwid"}/${safePathSegment(store.id)}`;
  const worktreeDir = path.join(repoRoot, ".ecwid-sync", "store-worktrees", safePathSegment(store.id));
  await mkdir(path.dirname(worktreeDir), { recursive: true });
  await createOrOpenStoreWorktree(repoRoot, worktreeDir, branch, store);

  const interval = intervalMinutes(config, store);
  const manifest = await readManifest(worktreeDir);
  const nextDue = dueAt(manifest?.lastSyncedAt, interval);
  if (args.dueOnly && !args.force && nextDue && nextDue > new Date(observedAt)) {
    console.log(`skip ${store.id}: next sync not before ${isoNoMillis(nextDue)}`);
    await rm(worktreeDir, { recursive: true, force: true });
    runGit(["worktree", "prune"], { cwd: repoRoot, quiet: true, allowFailure: true });
    return null;
  }

  const productsDir = path.join(worktreeDir, "products");
  await mkdir(productsDir, { recursive: true });
  const existing = await readExistingProducts(productsDir);
  const fetched = await fetchAllProducts(store, options);
  const seen = new Set<string>();
  const nextRecords: Array<{ productId: string; hash: string }> = [];
  const events: ProductEvent[] = [];
  let created = 0, updated = 0, deleted = 0, fieldEvents = 0;

  for (const product of fetched) {
    const id = productId(product, store.id);
    if (seen.has(id)) throw new Error(`Ecwid returned duplicate product id ${id} for store ${store.id}`);
    seen.add(id);
    const filePath = path.join(productsDir, `${safePathSegment(id)}.json`);
    const canonical = stableStringify(product);
    const hash = sha256Text(canonical);
    const previous = existing.get(id);
    nextRecords.push({ productId: id, hash });
    if (!previous) {
      await writeFile(filePath, canonical, "utf8");
      events.push(createdEvent({ storeId: store.id, productId: id, runId, observedAt }, product, hash));
      created += 1;
    } else if (previous.hash !== hash) {
      await writeFile(filePath, canonical, "utf8");
      const productEvents = fieldChangedEvents({ storeId: store.id, productId: id, runId, observedAt }, diffJson(previous.product, product), previous.hash, hash);
      events.push(...productEvents);
      updated += 1;
      fieldEvents += productEvents.length;
    }
  }

  for (const [id, previous] of [...existing.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (seen.has(id)) continue;
    await unlink(previous.filePath);
    events.push(deletedEvent({ storeId: store.id, productId: id, runId, observedAt }, previous.product, previous.hash));
    deleted += 1;
  }

  const productsHash = productsHashFromRecords(nextRecords);
  let eventFile: string | undefined;
  if (events.length > 0) {
    const digest = eventRunDigest(events);
    const dayPath = observedAt.slice(0, 10).replaceAll("-", "/");
    const eventDir = path.join(worktreeDir, "events", dayPath);
    eventFile = `events/${dayPath}/${digest}.jsonl`;
    await mkdir(eventDir, { recursive: true });
    await writeFile(path.join(eventDir, `${digest}.jsonl`), eventJsonl(events), "utf8");
  }

  const nextNotBefore = isoNoMillis(new Date(new Date(observedAt).valueOf() + interval * 60_000));
  const branchManifest: StoreBranchManifest = {
    schemaVersion: 2,
    source: "ecwid",
    storeId: store.id,
    storeName: store.name ?? null,
    productCount: nextRecords.length,
    productsHash,
    lastSyncedAt: observedAt,
    lastChangedAt: events.length > 0 ? observedAt : manifest?.lastChangedAt ?? null,
    lastRunId: runId,
    lastEventFile: eventFile ?? manifest?.lastEventFile ?? null,
    syncIntervalMinutes: interval,
    nextSyncNotBefore: nextNotBefore
  };
  await writeFile(path.join(worktreeDir, "store.json"), stableStringify(branchManifest as never), "utf8");
  await writeFile(path.join(worktreeDir, "config.json"), stableStringify({ ...store, token: undefined } as never), "utf8");

  const summary: StoreSyncSummary = { storeId: store.id, fetched: fetched.length, created, updated, deleted, fieldEvents, eventFile, productsHash };
  await writeResolvedStoreState({ worktreeDir, store, observedAt, fetchedProducts: fetched, events, eventFile, summary });
  await dispatchWebhooks(store, events, summary);

  setupGitIdentity(worktreeDir);
  runGit(["add", "README.md", "config.json", "store.json", "products", "events", "state"], { cwd: worktreeDir, quiet: true, allowFailure: true });
  if (gitSuccess(["diff", "--cached", "--quiet"], worktreeDir)) {
    console.log(`store ${store.id}: no changes`);
  } else {
    const msg = events.length > 0
      ? `sync(ecwid:${store.id}): ${created} created, ${updated} updated, ${deleted} deleted`
      : `sync(ecwid:${store.id}): refresh metadata`;
    runGit(["commit", "--quiet", "-m", msg], { cwd: worktreeDir });
    if (!args.noPush) runGit(["push", "origin", `HEAD:${branch}`], { cwd: worktreeDir });
  }

  await rm(worktreeDir, { recursive: true, force: true });
  runGit(["worktree", "prune"], { cwd: repoRoot, quiet: true, allowFailure: true });
  return summary;
}

export async function syncStoreBranches(args: Args, options: FetchAllProductsOptions = {}): Promise<SyncSummary> {
  const config = await loadConfig(path.resolve(args.cwd, args.configPath));
  const now = new Date();
  const observedAt = isoNoMillis(now);
  const runId = observedAt.replaceAll(/[-:]/g, "").replace("T", "-").replace("Z", "Z");
  const selected = new Set(args.storeIds);
  const stores = config.stores.filter((store) => store.enabled !== false && (selected.size === 0 || selected.has(store.id)));
  const summaries: StoreSyncSummary[] = [];
  for (const store of stores) {
    const summary = await syncInStoreBranch(config, store, args.cwd, observedAt, runId, args, options);
    if (summary) summaries.push(summary);
  }
  const syncSummary: SyncSummary = { runId, observedAt, stores: summaries };
  await mkdir(path.join(args.cwd, ".ecwid-sync"), { recursive: true });
  await writeFile(path.join(args.cwd, ".ecwid-sync", "summary.json"), stableStringify(syncSummary as never), "utf8");
  console.log(JSON.stringify(syncSummary, null, 2));
  return syncSummary;
}

if (import.meta.main) {
  syncStoreBranches(parseArgs(process.argv.slice(2))).catch((error: unknown) => {
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exit(1);
  });
}
