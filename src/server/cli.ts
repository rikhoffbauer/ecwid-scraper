#!/usr/bin/env bun
import path from "node:path";
import { OperationsDatabase } from "./operations/database.ts";
import { syncStores } from "./sync.ts";

interface Args {
  command: "sync";
  cwd: string;
}

function parseArgs(argv: string[]): Args {
  const command = argv.shift();
  if (command !== "sync") {
    throw new Error(`Usage: ecwid-product-sync sync [--cwd .]`);
  }

  let cwd = process.cwd();

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--config") {
      // Ignore --config for backwards compatibility during migration
      i += 1;
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

  return { command: "sync", cwd };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const db = new OperationsDatabase();
  const config = { stores: db.listStores(), defaultSyncIntervalMinutes: 30 };
  const summary = await syncStores(config, { cwd: args.cwd, db });
  console.log(JSON.stringify(summary, null, 2));
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exit(1);
  });
}
