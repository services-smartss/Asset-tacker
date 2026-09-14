import path from "node:path";
import fs from "node:fs";
import { defineConfig } from "prisma/config";
import { normalizeDatabaseUrl } from "./prisma/db-url.mjs";

// Load .env manually since Prisma CLI doesn't auto-load it
function loadEnv() {
  if (process.env.DATABASE_URL) return;
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

loadEnv();

// Prefer a direct (unpooled) URL for Prisma CLI / migrate.
// Neon/Vercel pooled URLs (*-pooler.*) break migrate because SET search_path
// and advisory locks are not reliable through PgBouncer transaction pooling.
const datasourceUrl = normalizeDatabaseUrl(
  process.env.DIRECT_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    "",
  { forMigrate: true },
);

if (!datasourceUrl) {
  throw new Error(
    "DATABASE_URL is empty. Set DATABASE_URL in Vercel → Settings → Environment Variables (Production + Build). For Neon, also set DIRECT_URL to the non-pooled connection string.",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.js",
  },
  datasource: {
    url: datasourceUrl,
  },
});
