import { sha256Text } from "./canonical-json.ts";

export const GITHUB_BLOCKED_BLOB_BYTES = 100 * 1024 * 1024;
export const DEFAULT_JSONL_SHARD_TARGET_BYTES = 24 * 1024 * 1024;

const encoder = new TextEncoder();

export interface JsonlShard<T> {
  index: number;
  total: number;
  fileName: string;
  records: T[];
  text: string;
  byteLength: number;
  hash: string;
}

export interface SplitJsonlRecordsOptions<T> {
  records: T[];
  fileStem: string;
  render: (record: T) => string;
  maxBytes?: number;
  maxRecords?: number;
}

export function utf8ByteLength(text: string): number {
  return encoder.encode(text).byteLength;
}

function validateMaxBytes(maxBytes: number): void {
  if (!Number.isFinite(maxBytes) || maxBytes <= 0) throw new Error(`maxBytes must be a positive finite number, got ${maxBytes}`);
  if (maxBytes >= GITHUB_BLOCKED_BLOB_BYTES) {
    throw new Error(`maxBytes must stay below GitHub's 100 MiB blob limit; got ${maxBytes} bytes`);
  }
}

function validateFileStem(fileStem: string): void {
  if (!/^[A-Za-z0-9._-]+$/.test(fileStem)) throw new Error(`fileStem contains unsafe characters: ${fileStem}`);
}

export function splitJsonlRecords<T>(options: SplitJsonlRecordsOptions<T>): JsonlShard<T>[] {
  const maxBytes = options.maxBytes ?? DEFAULT_JSONL_SHARD_TARGET_BYTES;
  validateMaxBytes(maxBytes);
  validateFileStem(options.fileStem);
  if (options.maxRecords !== undefined && (!Number.isInteger(options.maxRecords) || options.maxRecords <= 0)) {
    throw new Error(`maxRecords must be a positive integer, got ${options.maxRecords}`);
  }
  if (options.records.length === 0) return [];

  const chunks: Array<{ records: T[]; lines: string[]; byteLength: number }> = [];
  let currentRecords: T[] = [];
  let currentLines: string[] = [];
  let currentBytes = 0;

  const flush = (): void => {
    if (currentRecords.length === 0) return;
    chunks.push({ records: currentRecords, lines: currentLines, byteLength: currentBytes });
    currentRecords = [];
    currentLines = [];
    currentBytes = 0;
  };

  for (const record of options.records) {
    const line = `${options.render(record)}\n`;
    const lineBytes = utf8ByteLength(line);
    if (lineBytes >= GITHUB_BLOCKED_BLOB_BYTES) {
      throw new Error(`single JSONL record is ${lineBytes} bytes, which exceeds GitHub's 100 MiB blob limit`);
    }

    const wouldExceedBytes = currentRecords.length > 0 && currentBytes + lineBytes > maxBytes;
    const wouldExceedRecords = options.maxRecords !== undefined && currentRecords.length >= options.maxRecords;
    if (wouldExceedBytes || wouldExceedRecords) flush();

    currentRecords.push(record);
    currentLines.push(line);
    currentBytes += lineBytes;
  }
  flush();

  const total = chunks.length;
  const width = Math.max(5, String(total).length);
  return chunks.map((chunk, index) => {
    const text = chunk.lines.join("");
    const byteLength = utf8ByteLength(text);
    if (byteLength >= GITHUB_BLOCKED_BLOB_BYTES) {
      throw new Error(`generated JSONL shard is ${byteLength} bytes, which exceeds GitHub's 100 MiB blob limit`);
    }
    const fileName = total === 1
      ? `${options.fileStem}.jsonl`
      : `${options.fileStem}.part-${String(index + 1).padStart(width, "0")}-of-${String(total).padStart(width, "0")}.jsonl`;
    return {
      index,
      total,
      fileName,
      records: chunk.records,
      text,
      byteLength,
      hash: sha256Text(text)
    };
  });
}
