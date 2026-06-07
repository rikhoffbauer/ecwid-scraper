import { stableStringify } from "./canonical-json.ts";
import type { EcwidProductsPage, JsonObject, StoreConfig } from "./types.ts";

const DEFAULT_API_BASE_URL = "https://app.ecwid.com";
const DEFAULT_LIMIT = 200;
const DEFAULT_REQUEST_DELAY_MS = 100;
const MAX_CONSISTENCY_PASSES = 4;

function resolveStoreToken(store: StoreConfig): string {
  if (store.token) return store.token;
  if (store.tokenEnv) {
    const envToken = process.env[store.tokenEnv];
    if (envToken) return envToken;
  }
  throw new Error(`Token is required for store ${store.id}`);
}

export interface FetchAllProductsOptions {
  fetchImpl?: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
  userAgent?: string;
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assertProductsPage(value: unknown, storeId: string, offset: number): asserts value is EcwidProductsPage {
  if (value === null || typeof value !== "object") {
    throw new Error(`Invalid Ecwid response for store ${storeId} offset ${offset}: expected object`);
  }

  const page = value as Partial<EcwidProductsPage>;
  if (!Number.isInteger(page.total) || !Number.isInteger(page.count) || !Number.isInteger(page.offset)) {
    throw new Error(`Invalid Ecwid response for store ${storeId} offset ${offset}: missing total/count/offset`);
  }
  if (!Array.isArray(page.items)) {
    throw new Error(`Invalid Ecwid response for store ${storeId} offset ${offset}: missing items array`);
  }
}

async function fetchProductsPage(
  store: StoreConfig,
  offset: number,
  options: Required<FetchAllProductsOptions>,
  attempt = 1
): Promise<EcwidProductsPage> {
  const token = resolveStoreToken(store);
  const limit = store.limit ?? DEFAULT_LIMIT;
  const apiBaseUrl = store.apiBaseUrl ?? DEFAULT_API_BASE_URL;
  const url = new URL(`/api/v3/${store.id}/products`, apiBaseUrl);

  url.searchParams.set("token", token);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));

  for (const [key, value] of Object.entries(store.extraQuery ?? {})) {
    url.searchParams.set(key, String(value));
  }

  const response = await options.fetchImpl(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": options.userAgent
    }
  });

  if (!response.ok) {
    const retryable = response.status === 429 || response.status >= 500;
    if (retryable && attempt < 5) {
      await sleep(500 * attempt * attempt);
      return fetchProductsPage(store, offset, options, attempt + 1);
    }

    const body = await response.text();
    throw new Error(
      `Ecwid products request failed for store ${store.id} offset ${offset}: ` +
        `${response.status} ${response.statusText}\n${body}`
    );
  }

  const json = await response.json();
  assertProductsPage(json, store.id, offset);
  return json;
}

export async function* fetchAllProducts(store: StoreConfig, options: FetchAllProductsOptions = {}): AsyncGenerator<JsonObject[], void, unknown> {
  const limit = store.limit ?? DEFAULT_LIMIT;
  const delayMs = store.requestDelayMs ?? DEFAULT_REQUEST_DELAY_MS;
  const resolvedOptions: Required<FetchAllProductsOptions> = {
    fetchImpl: options.fetchImpl ?? fetch,
    userAgent: options.userAgent ?? "ecwid-product-git-watch/0.1"
  };

  let offset = 0;
  let total = Number.POSITIVE_INFINITY;

  while (offset < total) {
    const page = await fetchProductsPage(store, offset, resolvedOptions);
    total = page.total;
    
    if (page.items.length > 0) {
      yield page.items as unknown as JsonObject[];
    }

    if (page.items.length === 0 || page.count === 0) break;
    offset += limit;
    if (offset < total && delayMs > 0) await sleep(delayMs);
  }
}
