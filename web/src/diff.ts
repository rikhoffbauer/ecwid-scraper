import { stableStringify } from "./json";

export interface JsonChange {
  op: "add" | "remove" | "replace";
  path: string;
  before?: unknown;
  after?: unknown;
}

function escapePointerSegment(segment: string): string {
  return segment.replaceAll("~", "~0").replaceAll("/", "~1");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function equalJson(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b);
}

export function diffJson(previous: unknown, current: unknown, basePath = ""): JsonChange[] {
  if (equalJson(previous, current)) return [];
  if (isPlainObject(previous) && isPlainObject(current)) {
    const changes: JsonChange[] = [];
    const keys = new Set([...Object.keys(previous), ...Object.keys(current)]);
    for (const key of [...keys].sort()) {
      const path = `${basePath}/${escapePointerSegment(key)}`;
      const previousHas = Object.prototype.hasOwnProperty.call(previous, key);
      const currentHas = Object.prototype.hasOwnProperty.call(current, key);
      if (!previousHas && currentHas) changes.push({ op: "add", path, after: current[key] });
      else if (previousHas && !currentHas) changes.push({ op: "remove", path, before: previous[key] });
      else changes.push(...diffJson(previous[key], current[key], path));
    }
    return changes;
  }
  return [{ op: "replace", path: basePath || "", before: previous, after: current }];
}
