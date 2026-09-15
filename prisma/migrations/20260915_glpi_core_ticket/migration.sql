ALTER TABLE "public"."tickets"
  ADD COLUMN IF NOT EXISTS "urgency" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS "impact" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS "solutionStatus" VARCHAR(20) NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS "globalValidation" VARCHAR(20) NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS "timeToOwn" TIMESTAMP(6),
  ADD COLUMN IF NOT EXISTS "timeToResolve" TIMESTAMP(6),
  ADD COLUMN IF NOT EXISTS "slaPausedAt" TIMESTAMP(6),
  ADD COLUMN IF NOT EXISTS "slaPolicyId" UUID;

UPDATE "public"."tickets"
SET
  "urgency" = CASE "priority"
    WHEN 'very_low' THEN 1
    WHEN 'low' THEN 2
    WHEN 'high' THEN 4
    WHEN 'urgent' THEN 5
    ELSE 3
  END,
  "impact" = CASE "priority"
    WHEN 'very_low' THEN 1
    WHEN 'low' THEN 2
    WHEN 'high' THEN 4
    WHEN 'urgent' THEN 5
    ELSE 3
  END;

UPDATE "public"."tickets"
SET "priority" = CASE ROUND(("urgency" + "impact") / 2.0)
  WHEN 1 THEN 'very_low'
  WHEN 2 THEN 'low'
  WHEN 4 THEN 'high'
  WHEN 5 THEN 'urgent'
  ELSE 'medium'
END;

UPDATE "public"."tickets"
SET "solutionStatus" = 'accepted'
WHERE "solution" IS NOT NULL AND TRIM("solution") <> '';

UPDATE "public"."tickets"
SET
  "timeToOwn" = "createdAt" + INTERVAL '8 hours',
  "timeToResolve" = "createdAt" + INTERVAL '24 hours'
WHERE "status" IN ('new', 'processing', 'pending', 'in_progress');

CREATE TABLE IF NOT EXISTS "public"."ticket_sla_policies" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL DEFAULT 'Default',
  "ttoMinutes" INTEGER NOT NULL DEFAULT 480,
  "ttrMinutes" INTEGER NOT NULL DEFAULT 1440,
  "pauseOnPending" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ticket_sla_policies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ticket_sla_policies_organizationId_key"
  ON "public"."ticket_sla_policies"("organizationId");

ALTER TABLE "public"."ticket_sla_policies"
  DROP CONSTRAINT IF EXISTS "ticket_sla_policies_organizationId_fkey";
ALTER TABLE "public"."ticket_sla_policies"
  ADD CONSTRAINT "ticket_sla_policies_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "public"."ticket_sla_policies" ("organizationId")
SELECT "id" FROM "public"."organizations"
ON CONFLICT ("organizationId") DO NOTHING;

CREATE TABLE IF NOT EXISTS "public"."ticket_actors" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ticketId" UUID NOT NULL,
  "role" VARCHAR(20) NOT NULL,
  "userId" UUID,
  "departmentId" UUID,
  "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ticket_actors_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ticket_actors_ticketId_idx" ON "public"."ticket_actors"("ticketId");
CREATE INDEX IF NOT EXISTS "ticket_actors_userId_idx" ON "public"."ticket_actors"("userId");
CREATE INDEX IF NOT EXISTS "ticket_actors_departmentId_idx" ON "public"."ticket_actors"("departmentId");
CREATE INDEX IF NOT EXISTS "ticket_actors_ticketId_role_idx" ON "public"."ticket_actors"("ticketId", "role");

CREATE UNIQUE INDEX IF NOT EXISTS "ticket_actors_unicity"
  ON "public"."ticket_actors" (
    "ticketId",
    "role",
    COALESCE("userId", '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE("departmentId", '00000000-0000-0000-0000-000000000000'::uuid)
  );

ALTER TABLE "public"."ticket_actors"
  DROP CONSTRAINT IF EXISTS "ticket_actors_actor_present";
ALTER TABLE "public"."ticket_actors"
  ADD CONSTRAINT "ticket_actors_actor_present"
  CHECK ("userId" IS NOT NULL OR "departmentId" IS NOT NULL);

ALTER TABLE "public"."ticket_actors"
  DROP CONSTRAINT IF EXISTS "ticket_actors_ticketId_fkey";
ALTER TABLE "public"."ticket_actors"
  ADD CONSTRAINT "ticket_actors_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "public"."tickets"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ticket_actors"
  DROP CONSTRAINT IF EXISTS "ticket_actors_userId_fkey";
ALTER TABLE "public"."ticket_actors"
  ADD CONSTRAINT "ticket_actors_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "public"."user"("userid")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ticket_actors"
  DROP CONSTRAINT IF EXISTS "ticket_actors_departmentId_fkey";
ALTER TABLE "public"."ticket_actors"
  ADD CONSTRAINT "ticket_actors_departmentId_fkey"
  FOREIGN KEY ("departmentId") REFERENCES "public"."departments"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "public"."ticket_actors" ("ticketId", "role", "userId")
SELECT "id", 'requester', "createdBy"
FROM "public"."tickets"
ON CONFLICT DO NOTHING;

INSERT INTO "public"."ticket_actors" ("ticketId", "role", "userId")
SELECT "id", 'assignee', "assignedTo"
FROM "public"."tickets"
WHERE "assignedTo" IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS "public"."ticket_tasks" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ticketId" UUID NOT NULL,
  "createdBy" UUID NOT NULL,
  "assignedTo" UUID,
  "content" TEXT NOT NULL,
  "state" VARCHAR(20) NOT NULL DEFAULT 'todo',
  "begin" TIMESTAMP(6),
  "end" TIMESTAMP(6),
  "actionMinutes" INTEGER,
  "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ticket_tasks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ticket_tasks_ticketId_idx" ON "public"."ticket_tasks"("ticketId");
CREATE INDEX IF NOT EXISTS "ticket_tasks_createdBy_idx" ON "public"."ticket_tasks"("createdBy");
CREATE INDEX IF NOT EXISTS "ticket_tasks_assignedTo_idx" ON "public"."ticket_tasks"("assignedTo");

ALTER TABLE "public"."ticket_tasks"
  DROP CONSTRAINT IF EXISTS "ticket_tasks_ticketId_fkey";
ALTER TABLE "public"."ticket_tasks"
  ADD CONSTRAINT "ticket_tasks_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "public"."tickets"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ticket_tasks"
  DROP CONSTRAINT IF EXISTS "ticket_tasks_createdBy_fkey";
ALTER TABLE "public"."ticket_tasks"
  ADD CONSTRAINT "ticket_tasks_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "public"."user"("userid")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ticket_tasks"
  DROP CONSTRAINT IF EXISTS "ticket_tasks_assignedTo_fkey";
ALTER TABLE "public"."ticket_tasks"
  ADD CONSTRAINT "ticket_tasks_assignedTo_fkey"
  FOREIGN KEY ("assignedTo") REFERENCES "public"."user"("userid")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "public"."ticket_validations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ticketId" UUID NOT NULL,
  "requestedBy" UUID NOT NULL,
  "targetUserId" UUID NOT NULL,
  "commentSubmission" TEXT,
  "commentValidation" TEXT,
  "status" VARCHAR(20) NOT NULL DEFAULT 'waiting',
  "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedAt" TIMESTAMP(6),
  CONSTRAINT "ticket_validations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ticket_validations_ticketId_idx" ON "public"."ticket_validations"("ticketId");
CREATE INDEX IF NOT EXISTS "ticket_validations_targetUserId_idx" ON "public"."ticket_validations"("targetUserId");
CREATE INDEX IF NOT EXISTS "ticket_validations_status_idx" ON "public"."ticket_validations"("status");

ALTER TABLE "public"."ticket_validations"
  DROP CONSTRAINT IF EXISTS "ticket_validations_ticketId_fkey";
ALTER TABLE "public"."ticket_validations"
  ADD CONSTRAINT "ticket_validations_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "public"."tickets"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ticket_validations"
  DROP CONSTRAINT IF EXISTS "ticket_validations_requestedBy_fkey";
ALTER TABLE "public"."ticket_validations"
  ADD CONSTRAINT "ticket_validations_requestedBy_fkey"
  FOREIGN KEY ("requestedBy") REFERENCES "public"."user"("userid")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ticket_validations"
  DROP CONSTRAINT IF EXISTS "ticket_validations_targetUserId_fkey";
ALTER TABLE "public"."ticket_validations"
  ADD CONSTRAINT "ticket_validations_targetUserId_fkey"
  FOREIGN KEY ("targetUserId") REFERENCES "public"."user"("userid")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "tickets_slaPolicyId_idx" ON "public"."tickets"("slaPolicyId");
CREATE INDEX IF NOT EXISTS "tickets_timeToResolve_idx" ON "public"."tickets"("timeToResolve");

ALTER TABLE "public"."tickets"
  DROP CONSTRAINT IF EXISTS "tickets_slaPolicyId_fkey";
ALTER TABLE "public"."tickets"
  ADD CONSTRAINT "tickets_slaPolicyId_fkey"
  FOREIGN KEY ("slaPolicyId") REFERENCES "public"."ticket_sla_policies"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
