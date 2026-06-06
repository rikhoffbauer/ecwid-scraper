#!/usr/bin/env bun
import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadConfig } from "./config.ts";
import { runGit, gitOutput, gitSuccess } from "./git.ts";
import { safePathSegment } from "./safe-id.ts";

interface Args {
  configPath: string;
  noPush: boolean;
  cwd: string;
}

function parseArgs(argv: string[]): Args {
  let configPath = "config/ecwid-stores.json";
  let noPush = false;
  let cwd = process.cwd();

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--config") {
      const value = argv[++i];
      if (!value) throw new Error("--config requires a value");
      configPath = value;
      continue;
    }
    if (arg === "--no-push") {
      noPush = true;
      continue;
    }
    if (arg === "--cwd") {
      const value = argv[++i];
      if (!value) throw new Error("--cwd requires a value");
      cwd = path.resolve(value);
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return { configPath, noPush, cwd };
}

async function listFilesRecursive(dir: string): Promise<string[]> {
  const output: string[] = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (errorCode(error) === "ENOENT") return output;
    throw error;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      output.push(...(await listFilesRecursive(full)));
    } else if (entry.isFile()) {
      output.push(full);
    }
  }

  return output.sort();
}

function errorCode(error: unknown): string | undefined {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

function branchExists(branch: string, cwd: string): boolean {
  if (gitSuccess(["show-ref", "--verify", `refs/heads/${branch}`], cwd)) return true;
  return gitSuccess(["show-ref", "--verify", `refs/remotes/origin/${branch}`], cwd);
}

function setupGitIdentity(cwd: string): void {
  const name = runGit(["config", "--get", "user.name"], { cwd, quiet: true, allowFailure: true }).stdout.trim();
  const email = runGit(["config", "--get", "user.email"], { cwd, quiet: true, allowFailure: true }).stdout.trim();
  if (!name) runGit(["config", "user.name", "github-actions[bot]"], { cwd, quiet: true });
  if (!email) runGit(["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"], { cwd, quiet: true });
}

async function createOrOpenEventWorktree(params: {
  repoRoot: string;
  worktreeDir: string;
  branch: string;
  storeId: string;
}): Promise<void> {
  const { repoRoot, worktreeDir, branch, storeId } = params;
  await rm(worktreeDir, { recursive: true, force: true });

  runGit(["fetch", "origin", `+refs/heads/${branch}:refs/remotes/origin/${branch}`], {
    cwd: repoRoot,
    quiet: true,
    allowFailure: true
  });

  if (branchExists(branch, repoRoot)) {
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
  await writeFile(
    path.join(worktreeDir, "README.md"),
    `# Ecwid product events for store ${storeId}\n\nThis is an orphan branch containing append-only product event JSONL files.\n\n`,
    "utf8"
  );
}

async function commitStoreEvents(params: {
  repoRoot: string;
  sourceEventDir: string;
  eventBranchPrefix: string;
  storeId: string;
  noPush: boolean;
}): Promise<boolean> {
  const { repoRoot, sourceEventDir, eventBranchPrefix, storeId, noPush } = params;
  const files = await listFilesRecursive(sourceEventDir);
  if (files.length === 0) return false;

  const branch = `${eventBranchPrefix}/${storeId}`;
  const worktreeDir = path.join(repoRoot, ".ecwid-sync", "worktrees", safePathSegment(storeId));
  await mkdir(path.dirname(worktreeDir), { recursive: true });
  await createOrOpenEventWorktree({ repoRoot, worktreeDir, branch, storeId });

  for (const file of files) {
    const rel = path.relative(sourceEventDir, file);
    const dest = path.join(worktreeDir, "events", rel);
    await mkdir(path.dirname(dest), { recursive: true });
    await cp(file, dest, { force: true });
  }

  setupGitIdentity(worktreeDir);
  runGit(["add", "README.md", "events"], { cwd: worktreeDir, quiet: true });

  if (gitSuccess(["diff", "--cached", "--quiet"], worktreeDir)) {
    await rm(worktreeDir, { recursive: true, force: true });
    runGit(["worktree", "prune"], { cwd: repoRoot, quiet: true, allowFailure: true });
    return false;
  }

  runGit(["commit", "--quiet", "-m", `events(ecwid:${storeId}): append product events`], { cwd: worktreeDir });
  if (!noPush) runGit(["push", "origin", `HEAD:${branch}`], { cwd: worktreeDir });

  await rm(worktreeDir, { recursive: true, force: true });
  runGit(["worktree", "prune"], { cwd: repoRoot, quiet: true, allowFailure: true });
  return true;
}

export async function commitEventBranches(args: Args): Promise<void> {
  const config = await loadConfig(path.resolve(args.cwd, args.configPath));
  const eventRoot = path.resolve(args.cwd, config.eventsRoot);
  let committed = 0;

  for (const store of config.stores.filter((item) => item.enabled !== false)) {
    const storeId = safePathSegment(store.id);
    const sourceEventDir = path.join(eventRoot, storeId);
    const didCommit = await commitStoreEvents({
      repoRoot: args.cwd,
      sourceEventDir,
      eventBranchPrefix: config.eventBranchPrefix,
      storeId: store.id,
      noPush: args.noPush
    });
    if (didCommit) committed += 1;
  }

  console.log(`event branches committed: ${committed}`);
}

if (import.meta.main) {
  commitEventBranches(parseArgs(process.argv.slice(2))).catch((error: unknown) => {
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exit(1);
  });
}
