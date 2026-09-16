import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireApiAuth,
  requireApiAdmin,
  requireNotDemoMode,
} from "@/lib/api-auth";
import { getOrganizationContext } from "@/lib/organization-context";
import { createAuditLog, AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/lib/audit-log";
import { DEFAULT_TICKET_CATEGORY_NAMES } from "@/lib/ticket-ui";
import { logger } from "@/lib/logger";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  sortOrder: z.number().int().optional(),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(100).optional(),
  sortOrder: z.number().int().optional(),
});

const deleteSchema = z.object({
  id: z.string().uuid(),
});

async function ensureDefaults(organizationId: string | null) {
  const count = await prisma.ticket_categories.count({
    where: { organizationId },
  });
  if (count > 0) return;

  await prisma.ticket_categories.createMany({
    data: DEFAULT_TICKET_CATEGORY_NAMES.map((name, index) => ({
      name,
      organizationId,
      sortOrder: index + 1,
    })),
    skipDuplicates: true,
  });
}

export async function GET() {
  try {
    await requireApiAuth();
    const orgCtx = await getOrganizationContext();
    const orgId = orgCtx?.organization?.id ?? null;

    await ensureDefaults(orgId);

    const items = await prisma.ticket_categories.findMany({
      where: { organizationId: orgId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(items);
  } catch (error) {
    logger.error("GET /api/ticket-categories error", { error });
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch ticket categories" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const demoBlock = requireNotDemoMode();
    if (demoBlock) return demoBlock;
    const admin = await requireApiAdmin();

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const orgCtx = await getOrganizationContext();
    const orgId = orgCtx?.organization?.id ?? null;
    await ensureDefaults(orgId);

    const maxSort = await prisma.ticket_categories.aggregate({
      where: { organizationId: orgId },
      _max: { sortOrder: true },
    });

    const created = await prisma.ticket_categories.create({
      data: {
        name: parsed.data.name,
        organizationId: orgId,
        sortOrder: parsed.data.sortOrder ?? (maxSort._max.sortOrder ?? 0) + 1,
      },
    });

    await createAuditLog({
      userId: admin.id,
      action: AUDIT_ACTIONS.CREATE,
      entity: AUDIT_ENTITIES.TICKET_CATEGORY,
      entityId: created.id,
      details: { name: created.name },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    logger.error("POST /api/ticket-categories error", { error });
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "Category name already exists" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Failed to create ticket category" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const demoBlock = requireNotDemoMode();
    if (demoBlock) return demoBlock;
    const admin = await requireApiAdmin();

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const orgCtx = await getOrganizationContext();
    const orgId = orgCtx?.organization?.id ?? null;

    const existing = await prisma.ticket_categories.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.ticket_categories.update({
      where: { id: existing.id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.sortOrder !== undefined
          ? { sortOrder: parsed.data.sortOrder }
          : {}),
      },
    });

    // Keep ticket.category string in sync when renaming
    if (parsed.data.name && parsed.data.name !== existing.name) {
      await prisma.tickets.updateMany({
        where: { category: existing.name },
        data: { category: parsed.data.name },
      });
    }

    await createAuditLog({
      userId: admin.id,
      action: AUDIT_ACTIONS.UPDATE,
      entity: AUDIT_ENTITIES.TICKET_CATEGORY,
      entityId: updated.id,
      details: { from: existing.name, to: updated.name },
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error("PUT /api/ticket-categories error", { error });
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "Category name already exists" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Failed to update ticket category" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const demoBlock = requireNotDemoMode();
    if (demoBlock) return demoBlock;
    const admin = await requireApiAdmin();

    const body = await req.json();
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const orgCtx = await getOrganizationContext();
    const orgId = orgCtx?.organization?.id ?? null;

    const existing = await prisma.ticket_categories.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.ticket_categories.delete({ where: { id: existing.id } });

    await createAuditLog({
      userId: admin.id,
      action: AUDIT_ACTIONS.DELETE,
      entity: AUDIT_ENTITIES.TICKET_CATEGORY,
      entityId: existing.id,
      details: { name: existing.name },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("DELETE /api/ticket-categories error", { error });
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to delete ticket category" },
      { status: 500 },
    );
  }
}
