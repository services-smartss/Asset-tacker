-- GLPI-style ticket fields. Schema is "public" here; set-schema.mjs rewrites it
-- to the target DB_SCHEMA at build time.

ALTER TABLE "public"."tickets"
  ADD COLUMN IF NOT EXISTS "ticketNumber" INTEGER,
  ADD COLUMN IF NOT EXISTS "type" VARCHAR(20) NOT NULL DEFAULT 'incident',
  ADD COLUMN IF NOT EXISTS "category" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "assetId" UUID,
  ADD COLUMN IF NOT EXISTS "solution" TEXT,
  ADD COLUMN IF NOT EXISTS "solvedAt" TIMESTAMP(6),
  ADD COLUMN IF NOT EXISTS "solvedBy" UUID;

CREATE SEQUENCE IF NOT EXISTS "public"."tickets_ticketNumber_seq";

UPDATE "public"."tickets"
SET "ticketNumber" = nextval('"public"."tickets_ticketNumber_seq"')
WHERE "ticketNumber" IS NULL;

SELECT setval(
  '"public"."tickets_ticketNumber_seq"',
  GREATEST(COALESCE((SELECT MAX("ticketNumber") FROM "public"."tickets"), 1), 1)
);

ALTER TABLE "public"."tickets"
  ALTER COLUMN "ticketNumber" SET DEFAULT nextval('"public"."tickets_ticketNumber_seq"'),
  ALTER COLUMN "ticketNumber" SET NOT NULL;

ALTER SEQUENCE "public"."tickets_ticketNumber_seq" OWNED BY "public"."tickets"."ticketNumber";

CREATE UNIQUE INDEX IF NOT EXISTS "tickets_ticketNumber_key" ON "public"."tickets"("ticketNumber");
CREATE INDEX IF NOT EXISTS "tickets_type_idx" ON "public"."tickets"("type");
CREATE INDEX IF NOT EXISTS "tickets_assetId_idx" ON "public"."tickets"("assetId");

DO $$ BEGIN
ALTER TABLE "public"."tickets"
  ADD CONSTRAINT "tickets_assetId_fkey"
  FOREIGN KEY ("assetId") REFERENCES "public"."asset"("assetid") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
ALTER TABLE "public"."tickets"
  ADD CONSTRAINT "tickets_solvedBy_fkey"
  FOREIGN KEY ("solvedBy") REFERENCES "public"."user"("userid") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

UPDATE "public"."tickets" SET status = 'processing' WHERE status = 'in_progress';
UPDATE "public"."tickets" SET status = 'solved' WHERE status = 'completed';
UPDATE "public"."tickets" SET status = 'closed' WHERE status = 'cancelled';
