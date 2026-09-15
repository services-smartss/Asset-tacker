import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireApiAdmin,
  requireNotDemoMode,
} from "@/lib/api-auth";
import { getOrganizationContext } from "@/lib/organization-context";
import { logger } from "@/lib/logger";
import { uuidSchema } from "@/lib/validation";
import { ticketAccessWhere } from "@/lib/ticket-query";

const taskInclude = {
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
};

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
    const content = typeof body?.content === "string" ? body.content.trim() : "";
    if (!content) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
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

    const assignedTo =
      typeof body.assignedTo === "string" &&
      uuidSchema.safeParse(body.assignedTo).success
        ? body.assignedTo
        : null;

    const task = await prisma.ticket_tasks.create({
      data: {
        ticketId: id,
        createdBy: user.id!,
        content,
        assignedTo,
        actionMinutes:
          typeof body.actionMinutes === "number" ? body.actionMinutes : null,
        updatedAt: new Date(),
      },
      include: taskInclude,
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    logger.error("POST /api/tickets/[id]/tasks error", { error });
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to add task" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
