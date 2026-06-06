#!/usr/bin/env bun
import path from "node:path";
import { applyProductMutationRequests, type ProductMutationApplyArgs } from "./product-mutations.ts";

function required(value: string | undefined, flag: string): string {
  if (!value) throw new Error(`${flag} requires a value`);
  return value;
}

function parseArgs(argv: string[]): ProductMutationApplyArgs {
  const args: ProductMutationApplyArgs = {
    configPath: "config/ecwid-stores.json",
    cwd: process.cwd(),
    requestPaths: [],
    noPush: false
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--config") args.configPath = required(argv[++i], arg);
    else if (arg === "--cwd") args.cwd = path.resolve(required(argv[++i], arg));
    else if (arg === "--request") args.requestPaths.push(required(argv[++i], arg));
    else if (arg === "--no-push") args.noPush = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

if (import.meta.main) {
  applyProductMutationRequests(parseArgs(process.argv.slice(2))).then((summaries) => {
    console.log(JSON.stringify({ schemaVersion: 1, kind: "product-mutation-apply-summary", summaries }, null, 2));
  }).catch((error: unknown) => {
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exit(1);
  });
}
