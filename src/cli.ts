#!/usr/bin/env bun
import path from "node:path";
import { loadConfig } from "./config.ts";
import { syncStores } from "./sync.ts";

interface Args {
  command: "sync";
  configPath: string;
  cwd: string;
}

function parseArgs(argv: string[]): Args {
  const command = argv.shift();
  if (command !== "sync") {
    throw new Error(`Usage: ecwid-product-git-watch sync [--config config/ecwid-stores.json] [--cwd .]`);
  }

  let configPath = "config/ecwid-stores.json";
  let cwd = process.cwd();

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--config") {
      const value = argv[++i];
      if (!value) throw new Error("--config requires a value");
      configPath = value;
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

  return { command: "sync", configPath, cwd };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const config = await loadConfig(path.resolve(args.cwd, args.configPath));
  const summary = await syncStores(config, { cwd: args.cwd });
  console.log(JSON.stringify(summary, null, 2));
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exit(1);
  });
}
