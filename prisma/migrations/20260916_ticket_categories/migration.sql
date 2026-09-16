-- Ticket categories managed in DB (no longer hardcoded in app UI)
CREATE TABLE IF NOT EXISTS "public"."ticket_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "organizationId" UUID,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ticket_categories_organizationId_name_key"
  ON "public"."ticket_categories"("organizationId", "name");

CREATE INDEX IF NOT EXISTS "ticket_categories_organizationId_idx"
  ON "public"."ticket_categories"("organizationId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ticket_categories_organizationId_fkey'
  ) THEN
    ALTER TABLE "public"."ticket_categories"
      ADD CONSTRAINT "ticket_categories_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Allow longer category names on tickets
ALTER TABLE "public"."tickets"
  ALTER COLUMN "category" TYPE VARCHAR(100);

-- Seed default categories for every organization (and null-org rows)
INSERT INTO "public"."ticket_categories" ("name", "organizationId", "sortOrder")
SELECT d.name, o.id, d.sort_order
FROM "public"."organizations" o
CROSS JOIN (
  VALUES
    ('Hardware', 1),
    ('Software', 2),
    ('Network', 3),
    ('Access', 4),
    ('Printer', 5),
    ('Other', 6)
) AS d(name, sort_order)
ON CONFLICT ("organizationId", "name") DO NOTHING;
