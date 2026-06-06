export function stableStringify(value: unknown): string {
  return JSON.stringify(sortJson(value), null, 2) + "\n";
}

export function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, sortJson(child)]));
}

export function parseJsonObject<T>(text: string, label: string): T {
  try { return JSON.parse(text) as T; }
  catch (error) { throw new Error(`${label} is not valid JSON: ${(error as Error).message}`); }
}

export function encodeUtf8Base64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function decodeUtf8Base64(base64: string): string {
  const binary = atob(base64.replaceAll("\n", ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function safeJsonPreview(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export async function sha256Text(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function safePathSegment(id: string): string {
  if (/^[A-Za-z0-9._-]+$/.test(id)) return id;
  return encodeURIComponent(id).replaceAll("%", "_");
}
