export function safePathSegment(id: string): string {
  if (/^[A-Za-z0-9._-]+$/.test(id)) return id;
  return encodeURIComponent(id).replaceAll("%", "_");
}
