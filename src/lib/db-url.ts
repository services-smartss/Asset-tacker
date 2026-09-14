/**
 * Neon/Vercel connection strings often include channel_binding=require,
 * which breaks node-pg. Strip it at runtime; keep the pooled host.
 */
export function normalizeDatabaseUrl(url: string): string {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("channel_binding");
    return parsed.toString();
  } catch {
    return url;
  }
}
