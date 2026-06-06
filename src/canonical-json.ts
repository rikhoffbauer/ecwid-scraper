import { createHash } from "node:crypto";
import type { JsonValue } from "./types.ts";

export function normalizeJson(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeJson(item));
  }

  if (value !== null && typeof value === "object") {
    const input = value as Record<string, JsonValue>;
    const output: Record<string, JsonValue> = {};
    for (const key of Object.keys(input).sort()) {
      const child = input[key];
      if (typeof child !== "undefined") {
        output[key] = normalizeJson(child);
      }
    }
    return output;
  }

  return value;
}

export function stableStringify(value: JsonValue): string {
  return `${JSON.stringify(normalizeJson(value), null, 2)}\n`;
}

export function sha256Text(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function sha256Json(value: JsonValue): string {
  return sha256Text(stableStringify(value));
}
