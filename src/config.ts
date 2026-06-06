import { readFile } from "node:fs/promises";
import path from "node:path";
import type { AppConfig, ProductEventType, StoreConfig, StoreWebhookConfig } from "./types.ts";

const DEFAULT_PRODUCTS_ROOT = "data/stores";
const DEFAULT_EVENTS_ROOT = ".ecwid-sync/events";
const DEFAULT_EVENT_BRANCH_PREFIX = "events/ecwid";
const DEFAULT_STORE_BRANCH_PREFIX = "stores/ecwid";
const DEFAULT_SYNC_INTERVAL_MINUTES = 30;

function assertObject(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
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

function optionalInteger(value: unknown, label: string, min: number, max?: number): number | undefined {
  if (typeof value === "undefined") return undefined;
  if (!Number.isInteger(value)) throw new Error(`${label} must be an integer`);
  const n = value as number;
  if (n < min) throw new Error(`${label} must be >= ${min}`);
  if (typeof max === "number" && n > max) throw new Error(`${label} must be <= ${max}`);
  return n;
}

function parseExtraQuery(value: unknown, label: string): StoreConfig["extraQuery"] {
  if (typeof value === "undefined") return undefined;
  assertObject(value, label);
  const output: Record<string, string | number | boolean> = {};
  for (const [key, child] of Object.entries(value)) {
    if (!["string", "number", "boolean"].includes(typeof child)) throw new Error(`${label}.${key} must be string, number, or boolean`);
    output[key] = child as string | number | boolean;
  }
  return output;
}

function parseStringRecord(value: unknown, label: string): Record<string, string> | undefined {
  if (typeof value === "undefined") return undefined;
  assertObject(value, label);
  const output: Record<string, string> = {};
  for (const [key, child] of Object.entries(value)) {
    if (typeof child !== "string") throw new Error(`${label}.${key} must be a string`);
    output[key] = child;
  }
  return output;
}

function parseWebhook(value: unknown, label: string): StoreWebhookConfig {
  assertObject(value, label);
  const id = optionalString(value.id, `${label}.id`);
  const url = optionalString(value.url, `${label}.url`);
  if (!id) throw new Error(`${label}.id is required`);
  if (!url) throw new Error(`${label}.url is required`);
  let events: StoreWebhookConfig["events"] | undefined;
  if (typeof value.events !== "undefined") {
    if (!Array.isArray(value.events)) throw new Error(`${label}.events must be an array`);
    events = value.events.map((event, i) => {
      if (!["*", "product.created", "product.deleted", "product.field_changed"].includes(String(event))) throw new Error(`${label}.events[${i}] is invalid`);
      return event as ProductEventType | "*";
    }) as StoreWebhookConfig["events"];
  }
  return {
    id,
    url,
    enabled: optionalBoolean(value.enabled, `${label}.enabled`),
    events,
    secretEnv: optionalString(value.secretEnv, `${label}.secretEnv`),
    headers: parseStringRecord(value.headers, `${label}.headers`)
  };
}

function parseStore(value: unknown, index: number): StoreConfig {
  assertObject(value, `stores[${index}]`);
  const id = optionalString(value.id, `stores[${index}].id`);
  if (!id) throw new Error(`stores[${index}].id is required`);

  const token = optionalString(value.token, `stores[${index}].token`);
  const tokenEnv = optionalString(value.tokenEnv, `stores[${index}].tokenEnv`);
  if (!token && !tokenEnv) throw new Error(`stores[${index}] requires either token or tokenEnv`);

  return {
    id,
    name: optionalString(value.name, `stores[${index}].name`),
    enabled: optionalBoolean(value.enabled, `stores[${index}].enabled`),
    token,
    tokenEnv,
    apiBaseUrl: optionalString(value.apiBaseUrl, `stores[${index}].apiBaseUrl`),
    limit: optionalInteger(value.limit, `stores[${index}].limit`, 1, 100),
    requestDelayMs: optionalInteger(value.requestDelayMs, `stores[${index}].requestDelayMs`, 0),
    syncIntervalMinutes: optionalInteger(value.syncIntervalMinutes, `stores[${index}].syncIntervalMinutes`, 1),
    extraQuery: parseExtraQuery(value.extraQuery, `stores[${index}].extraQuery`),
    webhooks: Array.isArray(value.webhooks) ? value.webhooks.map((hook, hookIndex) => parseWebhook(hook, `stores[${index}].webhooks[${hookIndex}]`)) : undefined
  };
}

export async function loadConfig(configPath: string): Promise<AppConfig> {
  const absolutePath = path.resolve(configPath);
  const raw = await readFile(absolutePath, "utf8");
  const parsed: unknown = JSON.parse(raw);
  assertObject(parsed, "config");
  if (!Array.isArray(parsed.stores)) throw new Error("config.stores must be an array");
  return {
    productsRoot: optionalString(parsed.productsRoot, "config.productsRoot") ?? DEFAULT_PRODUCTS_ROOT,
    eventsRoot: optionalString(parsed.eventsRoot, "config.eventsRoot") ?? DEFAULT_EVENTS_ROOT,
    eventBranchPrefix: optionalString(parsed.eventBranchPrefix, "config.eventBranchPrefix") ?? DEFAULT_EVENT_BRANCH_PREFIX,
    storeBranchPrefix: optionalString(parsed.storeBranchPrefix, "config.storeBranchPrefix") ?? DEFAULT_STORE_BRANCH_PREFIX,
    defaultSyncIntervalMinutes: optionalInteger(parsed.defaultSyncIntervalMinutes, "config.defaultSyncIntervalMinutes", 1) ?? DEFAULT_SYNC_INTERVAL_MINUTES,
    stores: parsed.stores.map(parseStore)
  };
}

function tokenFromJsonSecret(store: StoreConfig): string | undefined {
  const raw = process.env.ECWID_STORE_TOKENS_JSON;
  if (!raw) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`ECWID_STORE_TOKENS_JSON is not valid JSON: ${(error as Error).message}`);
  }
  assertObject(parsed, "ECWID_STORE_TOKENS_JSON");
  const direct = parsed[store.id];
  if (typeof direct === "string" && direct) return direct;
  if (store.tokenEnv) {
    const byEnv = parsed[store.tokenEnv];
    if (typeof byEnv === "string" && byEnv) return byEnv;
  }
  return undefined;
}

export function resolveStoreToken(store: StoreConfig): string {
  if (store.token) return store.token;
  const fromJson = tokenFromJsonSecret(store);
  if (fromJson) return fromJson;
  if (!store.tokenEnv) throw new Error(`Store ${store.id} has no token or tokenEnv`);
  const token = process.env[store.tokenEnv];
  if (!token) throw new Error(`Environment variable ${store.tokenEnv} or ECWID_STORE_TOKENS_JSON entry is required for store ${store.id}`);
  return token;
}
