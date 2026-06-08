import type { ReadOnlyHttpClient } from "./types.ts";

const ALLOWED_METHODS = new Set(["GET", "HEAD"]);
type FetchFunction = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

function requestMethod(input: string | URL | Request, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase();
  if (input instanceof Request) return input.method.toUpperCase();
  return "GET";
}

export function createReadOnlyHttpClient(fetchImpl: FetchFunction = fetch): ReadOnlyHttpClient {
  return {
    fetch(input, init) {
      const method = requestMethod(input, init);
      if (!ALLOWED_METHODS.has(method)) {
        throw new Error(`Source HTTP is read-only; ${method} requests are forbidden`);
      }
      return fetchImpl(input, init);
    }
  };
}
