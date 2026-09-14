#!/usr/bin/env node
/**
 * Prisma migrate records progress in `_prisma_migrations`. Several SQL
 * migrations `SET search_path TO "<schema>"`, so Prisma then looks for that
 * table in the app schema instead of `public` and fails with P1014.
 *
 * Create an updatable view in the app schema that points at the real table
 * in `public`. Safe to run on every deploy; does not change migration checksums.
 */
import pg from "pg";
import { normalizeDatabaseUrl } from "./db-url.mjs";

const schema = process.env.DB_SCHEMA || "assettool";
if (!/^[a-zA-Z0-9_]+$/.test(schema)) {
  throw new Error(
    `Invalid DB_SCHEMA: "${schema}". Only alphanumeric and underscores allowed.`,
  );
}

const connectionString = normalizeDatabaseUrl(
  process.env.DIRECT_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    "",
  { forMigrate: true },
);

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is empty. Set DATABASE_URL (and DIRECT_URL for Neon pooled connections) before migrate.",
  );
}

const isCloudDatabase =
  process.env.DATABASE_SSL === "true" ||
  /supabase|neon\.tech|pooler\./i.test(connectionString);

const client = new pg.Client({
  connectionString,
  ssl: isCloudDatabase ? { rejectUnauthorized: false } : false,
});

await client.connect();

try {
  await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS public._prisma_migrations (
      id VARCHAR(36) PRIMARY KEY NOT NULL,
      checksum VARCHAR(64) NOT NULL,
      finished_at TIMESTAMPTZ,
      migration_name VARCHAR(255) NOT NULL,
      logs TEXT,
      rolled_back_at TIMESTAMPTZ,
      started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      applied_steps_count INTEGER NOT NULL DEFAULT 0
    )
  `);
  try {
    await client.query(
      `CREATE OR REPLACE VIEW "${schema}"._prisma_migrations AS SELECT * FROM public._prisma_migrations`,
    );
    console.log(
      `Ensured public._prisma_migrations and "${schema}"._prisma_migrations view`,
    );
  } catch (error) {
    // 42809 = object exists but is a table, not a view — Prisma can use it as-is
    if (error?.code !== "42809") throw error;
    console.log(
      `"${schema}"._prisma_migrations already exists as a table; leaving it in place`,
    );
  }
  await client.query(
    `DELETE FROM public._prisma_migrations WHERE finished_at IS NULL`,
  );
} finally {
  await client.end();
}
