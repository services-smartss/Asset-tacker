import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireApiAuth, requireNotDemoMode } from "@/lib/api-auth";
import { getOrganizationContext } from "@/lib/organization-context";
import { logger } from "@/lib/logger";
import { mapTicket, ticketAccessWhere, ticketInclude } from "@/lib/ticket-query";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; validationId: string }> },
) {
  try {
    const demoBlock = requireNotDemoMode();
    if (demoBlock) return demoBlock;

    const user = await requireApiAuth();
    const { id, validationId } = await params;
    const body = await req.json();
    const action = body?.action;

    if (action !== "accept" && action !== "refuse") {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    const orgContext = await getOrganizationContext();
    const ticket = await prisma.tickets.findFirst({
      where: {
        id,
        ...ticketAccessWhere(user, orgContext?.organization?.id),
      },
      select: { id: true },
    });
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const validation = await prisma.ticket_validations.findUnique({
      where: { id: validationId },
    });
    if (!validation || validation.ticketId !== id) {
      return NextResponse.json({ error: "Validation not found" }, { status: 404 });
    }
    if (!user.isAdmin && validation.targetUserId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.ticket_validations.update({
      where: { id: validationId },
      data: {
        status: action === "accept" ? "accepted" : "refused",
        commentValidation:
          typeof body.commentValidation === "string"
            ? body.commentValidation
            : validation.commentValidation,
        decidedAt: new Date(),
      },
    });

    const remaining = await prisma.ticket_validations.count({
      where: { ticketId: id, status: "waiting" },
    });
    const refused = await prisma.ticket_validations.count({
      where: { ticketId: id, status: "refused" },
    });

    const rawTicket = await prisma.tickets.update({
      where: { id },
      data: {
        globalValidation: remaining
          ? "waiting"
          : refused
            ? "refused"
            : "accepted",
        updatedAt: new Date(),
      },
      include: ticketInclude,
    });

    return NextResponse.json(mapTicket(rawTicket));
  } catch (error) {
    logger.error(
      "PATCH /api/tickets/[id]/validations/[validationId] error",
      { error },
    );
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to update validation" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
