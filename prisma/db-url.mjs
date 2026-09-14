/**
 * Neon/Vercel connection strings often include:
 *   - channel_binding=require  (breaks node-pg / Prisma)
 *   - *-pooler.* hosts         (PgBouncer; breaks prisma migrate)
 */

/**
 * @param {string} url
 * @param {{ forMigrate?: boolean }} [opts]
 * @returns {string}
 */
export function normalizeDatabaseUrl(url, opts = {}) {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("channel_binding");
    if (opts.forMigrate && parsed.hostname.includes("-pooler")) {
      parsed.hostname = parsed.hostname.replace("-pooler", "");
    }
    return parsed.toString();
  } catch {
    return url;
  }
}
