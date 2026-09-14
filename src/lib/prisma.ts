import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { normalizeDatabaseUrl } from "@/lib/db-url";

const connectionString = normalizeDatabaseUrl(process.env.DATABASE_URL ?? "");

// Determine SSL configuration based on environment
// For Supabase and other cloud providers, SSL is required
const isCloudDatabase =
  process.env.DATABASE_SSL === "true" ||
  connectionString.includes("supabase") ||
  connectionString.includes("pooler.supabase") ||
  connectionString.includes("neon.tech");

const pool = new pg.Pool({
  connectionString,
  ssl: isCloudDatabase ? { rejectUnauthorized: false } : false,
  // Serverless-optimized pool settings:
  // Keep pool small — each Vercel function gets its own pool,
  // so 50 concurrent invocations × max = total DB connections.
  max: process.env.NODE_ENV === "production" ? 3 : 10,
  idleTimeoutMillis: process.env.NODE_ENV === "production" ? 10_000 : 30_000,
  // Don't wait forever for a connection
  connectionTimeoutMillis: 5_000,
  // Prevent runaway queries
  statement_timeout: 30_000,
});

const adapter = new PrismaPg(pool);

declare global {
   
  var prisma: PrismaClient | undefined;
}

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient({ adapter });
} else {
  if (!globalThis.prisma) {
    globalThis.prisma = new PrismaClient({ adapter });
  }
  prisma = globalThis.prisma;
}

export default prisma;
