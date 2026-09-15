import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireApiAdmin,
  requireNotDemoMode,
} from "@/lib/api-auth";
import { getOrganizationContext } from "@/lib/organization-context";
import { logger } from "@/lib/logger";
import { ticketAccessWhere } from "@/lib/ticket-query";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> },
) {
  try {
    const demoBlock = requireNotDemoMode();
    if (demoBlock) return demoBlock;

    const user = await requireApiAdmin();
    const { id, taskId } = await params;
    const body = await req.json();

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

    const existing = await prisma.ticket_tasks.findFirst({
      where: { id: taskId, ticketId: id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const task = await prisma.ticket_tasks.update({
      where: { id: taskId },
      data: {
        ...(typeof body.content === "string" ? { content: body.content } : {}),
        ...(body.state === "todo" || body.state === "done"
          ? { state: body.state }
          : {}),
        ...(body.assignedTo !== undefined
          ? { assignedTo: body.assignedTo || null }
          : {}),
        ...(typeof body.actionMinutes === "number"
          ? { actionMinutes: body.actionMinutes }
          : {}),
        updatedAt: new Date(),
      },
      include: {
        creator: {
          select: {
            userid: true,
            username: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
        assignee: {
          select: {
            userid: true,
            username: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(task);
  } catch (error) {
    logger.error("PATCH /api/tickets/[id]/tasks/[taskId] error", { error });
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
