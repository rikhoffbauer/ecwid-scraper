import { stableStringify } from "./canonical-json.ts";
import type { JsonValue } from "./types.ts";

export interface JsonChange {
  op: "add" | "remove" | "replace";
  path: string;
  before?: JsonValue;
  after?: JsonValue;
}

function escapePointerSegment(segment: string): string {
  return segment.replaceAll("~", "~0").replaceAll("/", "~1");
}

function joinPointer(base: string, segment: string): string {
  return `${base}/${escapePointerSegment(segment)}`;
}

function isPlainObject(value: JsonValue): value is Record<string, JsonValue> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function equalJson(a: JsonValue, b: JsonValue): boolean {
  return stableStringify(a) === stableStringify(b);
}

export function diffJson(previous: JsonValue, current: JsonValue, basePath = ""): JsonChange[] {
  if (equalJson(previous, current)) return [];

  if (isPlainObject(previous) && isPlainObject(current)) {
    const changes: JsonChange[] = [];
    const keys = new Set([...Object.keys(previous), ...Object.keys(current)]);

    for (const key of [...keys].sort()) {
      const path = joinPointer(basePath, key);
      const previousHas = Object.prototype.hasOwnProperty.call(previous, key);
      const currentHas = Object.prototype.hasOwnProperty.call(current, key);

      if (!previousHas && currentHas) {
        changes.push({ op: "add", path, after: current[key] });
        continue;
      }

      if (previousHas && !currentHas) {
        changes.push({ op: "remove", path, before: previous[key] });
        continue;
      }

      const before = previous[key];
      const after = current[key];
      if (typeof before === "undefined" || typeof after === "undefined") continue;
      changes.push(...diffJson(before, after, path));
    }

    return changes;
  }

  return [{ op: "replace", path: basePath || "", before: previous, after: current }];
}
