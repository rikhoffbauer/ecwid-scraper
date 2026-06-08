import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { StoreConfig } from "../../shared/types.ts";
import type { ProductOfferingInput, GeneratedPageResult, ReadOnlySourceAdapter, SourceConfig } from "./types.ts";

export interface GeneratedAdapterManifest {
  schemaVersion: 1;
  adapterId: string;
  createdAt: string;
  sourceHost: string;
}

export type GeneratedOperation =
  | { operation: "catalog"; input: { config: SourceConfig; url: string; pageNumber: number } }
  | { operation: "product"; input: { config: SourceConfig; url: string } }
  | { operation: "search"; input: { config: SourceConfig; url: string; query: string } };

const FORBIDDEN_PATTERNS: Array<[RegExp, string]> = [
  [/^\s*import\b/m, "module import"],
  [/\b(?:import|export)\s*\(/, "dynamic import"],
  [/\b(?:eval|Function)\s*\(/, "dynamic code execution"],
  [/\b(?:process|Bun|Deno|require|globalThis)\b/, "host runtime access"],
  [/\b(?:node:|bun:)(?:fs|child_process|worker_threads|vm|net|tls|dgram|http|https|os)\b/, "dangerous module import"],
  [/(?:^|[^\w.])fetch\s*\(/m, "direct fetch"]
];

export function generatedAdaptersRoot(cwd = process.cwd()): string {
  return path.join(cwd, ".ecwid-sync", "adapters");
}

export function validateAdapterId(value: string): string {
  if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(value)) throw new Error("adapterId must contain 2-63 lowercase letters, digits, or hyphens");
  return value;
}

export function assertPublicHttpUrl(value: string | URL): URL {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error(`Generated adapter URL must use http or https: ${url}`);
  const host = url.hostname.toLowerCase();
  const privateIpv4 = /^(?:10\.|127\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/;
  if (host === "localhost" || host === "::1" || host.endsWith(".local") || privateIpv4.test(host)) {
    throw new Error(`Generated adapter URL must be public: ${url}`);
  }
  return url;
}

export function screenGeneratedAdapter(source: string): string[] {
  const issues: string[] = [];
  for (const [pattern, label] of FORBIDDEN_PATTERNS) if (pattern.test(source)) issues.push(`Generated adapter contains forbidden ${label}`);
  for (const name of ["fetchCatalogPage", "fetchProduct", "fetchSearchResults"]) {
    if (!new RegExp(`export\\s+(?:async\\s+)?function\\s+${name}\\b`).test(source)) issues.push(`Generated adapter must export function ${name}`);
  }
  return issues;
}

export function adapterPath(adapterId: string, cwd = process.cwd()): string {
  return path.join(generatedAdaptersRoot(cwd), validateAdapterId(adapterId), "adapter.ts");
}

export function assertGeneratedAdapter(adapterFile: string): void {
  if (!existsSync(adapterFile)) throw new Error(`Generated adapter not found: ${adapterFile}`);
  const issues = screenGeneratedAdapter(readFileSync(adapterFile, "utf8"));
  if (issues.length) throw new Error(issues.join("; "));
}

export async function runGeneratedOperation<T>(adapterFile: string, request: GeneratedOperation): Promise<T> {
  assertGeneratedAdapter(adapterFile);
  const worker = path.join(import.meta.dir, "generated-worker.ts");
  const child = Bun.spawn([process.execPath, worker], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
    env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", TMPDIR: process.env.TMPDIR ?? "/tmp" }
  });
  child.stdin.write(JSON.stringify({ adapterPath: adapterFile, ...request }));
  child.stdin.end();
  const timeout = setTimeout(() => child.kill(), 30_000);
  const [stdout, stderr, exitCode] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  clearTimeout(timeout);
  const line = stdout.trim().split("\n").at(-1);
  if (!line) throw new Error(`Generated adapter runner returned no result${stderr ? `: ${stderr.trim()}` : ""}`);
  const message = JSON.parse(line) as { ok: boolean; result?: T; error?: string };
  if (exitCode !== 0 || !message.ok) throw new Error(message.error ?? stderr.trim() ?? "Generated adapter runner failed");
  return message.result as T;
}

function generatedConfig(store: StoreConfig): SourceConfig {
  return {
    id: store.id,
    kind: "generated",
    name: store.name,
    url: store.url ?? store.onboarding?.catalogUrl ?? "",
    enabled: store.enabled,
    syncIntervalMinutes: store.syncIntervalMinutes,
    settings: store.settings as SourceConfig["settings"]
  };
}

export function createGeneratedSourceAdapter(store: StoreConfig, cwd = process.cwd()): ReadOnlySourceAdapter<StoreConfig> {
  if (!store.adapterId || !store.onboarding) throw new Error(`Generated source ${store.id} requires adapterId and onboarding settings`);
  const file = adapterPath(store.adapterId, cwd);
  return {
    kind: "generated",
    async *fetchProducts(config) {
      let url: string | undefined = config.onboarding?.catalogUrl;
      let pageNumber = config.onboarding?.catalogPageNumber ?? 1;
      const seenPages = new Set<string>();
      while (url) {
        if (seenPages.has(url)) throw new Error(`Generated adapter ${config.adapterId} repeated catalogue page ${url}`);
        seenPages.add(url);
        const result = await runGeneratedOperation<GeneratedPageResult>(file, {
          operation: "catalog",
          input: { config: generatedConfig(config), url, pageNumber }
        });
        if (result.products.length) yield result.products;
        url = result.nextPageUrl;
        pageNumber += 1;
      }
    },
    async *searchProducts(config, input) {
      const result = await runGeneratedOperation<GeneratedPageResult>(file, {
        operation: "search",
        input: { config: generatedConfig(config), url: config.onboarding!.searchUrl, query: input.query }
      });
      if (result.products.length) yield result.products;
    }
  };
}
