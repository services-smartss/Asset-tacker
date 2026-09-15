import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireApiAdmin,
  requireNotDemoMode,
} from "@/lib/api-auth";
import { getOrganizationContext } from "@/lib/organization-context";
import { logger } from "@/lib/logger";
import { uuidSchema } from "@/lib/validation";
import { mapTicket, ticketAccessWhere, ticketInclude } from "@/lib/ticket-query";
import { syncPrimaryAssignee } from "@/lib/ticket-itsm";

const ROLES = new Set(["requester", "observer", "assignee"]);

interface ActorInput {
  role?: string;
  userId?: string | null;
  departmentId?: string | null;
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const demoBlock = requireNotDemoMode();
    if (demoBlock) return demoBlock;

    const user = await requireApiAdmin();
    const { id } = await params;
    const body = await req.json();
    const actors = Array.isArray(body?.actors) ? (body.actors as ActorInput[]) : [];

    const orgContext = await getOrganizationContext();
    const orgId = orgContext?.organization?.id;
    const ticket = await prisma.tickets.findFirst({
      where: { id, ...ticketAccessWhere(user, orgId) },
      select: { id: true },
    });
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const normalized = actors
      .map((actor) => ({
        role: actor.role ?? "",
        userId:
          typeof actor.userId === "string" &&
          uuidSchema.safeParse(actor.userId).success
            ? actor.userId
            : null,
        departmentId:
          typeof actor.departmentId === "string" &&
          uuidSchema.safeParse(actor.departmentId).success
            ? actor.departmentId
            : null,
      }))
      .filter(
        (actor) =>
          ROLES.has(actor.role) && (actor.userId || actor.departmentId),
      );

    if (!normalized.some((actor) => actor.role === "requester" && actor.userId)) {
      return NextResponse.json(
        { error: "At least one requester user is required" },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.ticket_actors.deleteMany({ where: { ticketId: id } });
      await tx.ticket_actors.createMany({
        data: normalized.map((actor) => ({
          ticketId: id,
          role: actor.role,
          userId: actor.userId,
          departmentId: actor.departmentId,
        })),
      });
      const requester = normalized.find(
        (actor) => actor.role === "requester" && actor.userId,
      );
      if (requester?.userId) {
        await tx.tickets.update({
          where: { id },
          data: { createdBy: requester.userId, updatedAt: new Date() },
        });
      }
    });

    await syncPrimaryAssignee(id);

    const rawTicket = await prisma.tickets.findUniqueOrThrow({
      where: { id },
      include: ticketInclude,
    });
    return NextResponse.json(mapTicket(rawTicket));
  } catch (error) {
    logger.error("PUT /api/tickets/[id]/actors error", { error });
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Failed to update actors" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
