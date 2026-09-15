import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireApiAdmin,
  requireNotDemoMode,
} from "@/lib/api-auth";
import { getOrganizationContext } from "@/lib/organization-context";
import { logger } from "@/lib/logger";
import { uuidSchema } from "@/lib/validation";
import { ticketAccessWhere, mapTicket, ticketInclude } from "@/lib/ticket-query";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const demoBlock = requireNotDemoMode();
    if (demoBlock) return demoBlock;

    const user = await requireApiAdmin();
    const { id } = await params;
    const body = await req.json();
    const targetUserId = body?.targetUserId;
    if (!uuidSchema.safeParse(targetUserId).success) {
      return NextResponse.json(
        { error: "targetUserId is required" },
        { status: 400 },
      );
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

    await prisma.ticket_validations.create({
      data: {
        ticketId: id,
        requestedBy: user.id!,
        targetUserId,
        commentSubmission:
          typeof body.commentSubmission === "string"
            ? body.commentSubmission
            : null,
        status: "waiting",
      },
    });

    const rawTicket = await prisma.tickets.update({
      where: { id },
      data: { globalValidation: "waiting", updatedAt: new Date() },
      include: ticketInclude,
    });

    return NextResponse.json(mapTicket(rawTicket), { status: 201 });
  } catch (error) {
    logger.error("POST /api/tickets/[id]/validations error", { error });
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Failed to request validation" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
