import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import {
  requireApiAuth,
  requireNotDemoMode,
} from "@/lib/api-auth";
import { createFreshdeskClient } from "@/lib/freshdesk";
import { logger } from "@/lib/logger";
import { getOrganizationContext } from "@/lib/organization-context";
import { decrypt } from "@/lib/encryption";
import {
  notifyTicketAssigned,
  notifyTicketStatusChanged,
} from "@/lib/notifications";
import { uuidSchema } from "@/lib/validation";
import { mapTicket, ticketAccessWhere, ticketInclude } from "@/lib/ticket-query";
import { Prisma } from "@prisma/client";
import { applySlaPause } from "@/lib/ticket-ui";
import {
  ensureAssigneeActor,
  priorityFromBody,
  syncPrimaryAssignee,
} from "@/lib/ticket-itsm";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/tickets/[id]
 * Local ticket by UUID (creator or org admin). Freshdesk via ?source=freshdesk.
 */
export async function GET(req: Request, { params }: RouteParams) {
  const url = new URL(req.url);
  const { id } = await params;

  if (url.searchParams.get("source") === "freshdesk") {
    return getFreshdeskTicket(id);
  }

  return getLocalTicket(id);
}

async function getLocalTicket(id: string) {
  try {
    if (!uuidSchema.safeParse(id).success) {
      return NextResponse.json({ error: "Invalid ticket ID" }, { status: 400 });
    }

    const user = await requireApiAuth();
    const orgContext = await getOrganizationContext();
    const orgId = orgContext?.organization?.id;

    const rawTicket = await prisma.tickets.findFirst({
      where: {
        id,
        ...ticketAccessWhere(user, orgId),
      },
      include: ticketInclude,
    });

    if (!rawTicket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json(mapTicket(rawTicket));
  } catch (error) {
    logger.error("GET /api/tickets/[id] error", { error });
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch ticket" },
      { status: 500 },
    );
  }
}

async function getFreshdeskTicket(id: string) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.isadmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ticketId = parseInt(id, 10);

    if (isNaN(ticketId)) {
      return NextResponse.json({ error: "Invalid ticket ID" }, { status: 400 });
    }

    const [domainSetting, apiKeySetting] = await Promise.all([
      prisma.system_settings.findUnique({
        where: { settingKey: "freshdesk_domain" },
      }),
      prisma.system_settings.findUnique({
        where: { settingKey: "freshdesk_api_key" },
      }),
    ]);

    if (!domainSetting?.settingValue || !apiKeySetting?.settingValue) {
      return NextResponse.json(
        {
          error:
            "Freshdesk is not configured. Please configure it in Admin Settings.",
        },
        { status: 400 },
      );
    }

    const client = createFreshdeskClient({
      domain: domainSetting.settingValue,
      apiKey: decrypt(apiKeySetting.settingValue),
    });

    const result = await client.getTicket(ticketId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to fetch ticket" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ticket: result.data });
  } catch (error) {
    logger.error("GET /api/tickets/[id] (freshdesk) error", { error });
    return NextResponse.json(
      { error: "Failed to fetch ticket" },
      { status: 500 },
    );
  }
}

// PATCH /api/tickets/[id]
// Update a local ticket (status, priority, assignedTo, ITSM fields)
// Only admins can update tickets
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const demoBlock = requireNotDemoMode();
    if (demoBlock) return demoBlock;

    const user = await requireApiAuth();
    const { id } = await params;
    const body = await req.json();

    const {
      status,
      assignedTo,
      type,
      category,
      assetId,
      solution,
      urgency,
      impact,
      solutionAction,
    } = body || {};

    const orgContext = await getOrganizationContext();
    const orgId = orgContext?.organization?.id;

    const existingTicket = await prisma.tickets.findFirst({
      where: {
        id,
        ...ticketAccessWhere(user, orgId),
      },
      include: {
        actors: { select: { role: true, userId: true } },
        slaPolicy: {
          select: { pauseOnPending: true },
        },
      },
    });

    if (!existingTicket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const isRequester =
      existingTicket.createdBy === user.id ||
      existingTicket.actors.some(
        (actor) => actor.role === "requester" && actor.userId === user.id,
      );

    if (solutionAction === "accept" || solutionAction === "refuse") {
      if (!user.isAdmin && !isRequester) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const nextStatus =
        solutionAction === "accept"
          ? "solved"
          : existingTicket.status === "closed"
            ? "closed"
            : "processing";

      const sla = applySlaPause({
        status: existingTicket.status,
        nextStatus,
        timeToOwn: existingTicket.timeToOwn,
        timeToResolve: existingTicket.timeToResolve,
        slaPausedAt: existingTicket.slaPausedAt,
        pauseOnPending: existingTicket.slaPolicy?.pauseOnPending,
      });

      const rawTicket = await prisma.tickets.update({
        where: { id },
        data: {
          solutionStatus: solutionAction === "accept" ? "accepted" : "refused",
          status: nextStatus,
          timeToOwn: sla.timeToOwn,
          timeToResolve: sla.timeToResolve,
          slaPausedAt: sla.slaPausedAt,
          updatedAt: new Date(),
        },
        include: ticketInclude,
      });

      return NextResponse.json(mapTicket(rawTicket), { status: 200 });
    }

    if (!user.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 },
      );
    }

    const updateData: Prisma.ticketsUpdateInput = {
      updatedAt: new Date(),
    };

    if (status) {
      const sla = applySlaPause({
        status: existingTicket.status,
        nextStatus: status,
        timeToOwn: existingTicket.timeToOwn,
        timeToResolve: existingTicket.timeToResolve,
        slaPausedAt: existingTicket.slaPausedAt,
        pauseOnPending: existingTicket.slaPolicy?.pauseOnPending,
      });
      updateData.status = status;
      updateData.timeToOwn = sla.timeToOwn;
      updateData.timeToResolve = sla.timeToResolve;
      updateData.slaPausedAt = sla.slaPausedAt;
    }
    if (urgency !== undefined || impact !== undefined) {
      const matrix = priorityFromBody({
        urgency: urgency ?? existingTicket.urgency,
        impact: impact ?? existingTicket.impact,
      });
      updateData.urgency = matrix.urgency;
      updateData.impact = matrix.impact;
      updateData.priority = matrix.priority;
    }
    if (assignedTo !== undefined) {
      updateData.user_tickets_assignedToTouser = assignedTo
        ? { connect: { userid: assignedTo } }
        : { disconnect: true };
    }
    if (type === "incident" || type === "request") updateData.type = type;
    if (category !== undefined) updateData.category = category || null;

    if (assetId !== undefined) {
      if (assetId === null || assetId === "") {
        updateData.asset = { disconnect: true };
      } else if (uuidSchema.safeParse(assetId).success) {
        const asset = await prisma.asset.findUnique({
          where: { assetid: assetId },
          select: { assetid: true },
        });
        if (!asset) {
          return NextResponse.json(
            { error: "Asset not found" },
            { status: 400 },
          );
        }
        updateData.asset = { connect: { assetid: assetId } };
      }
    }

    if (typeof solution === "string" && solution.trim()) {
      updateData.solution = solution.trim();
      updateData.solutionStatus = "waiting";
      updateData.solvedAt = new Date();
      if (user.id) {
        updateData.user_tickets_solvedByTouser = {
          connect: { userid: user.id },
        };
      }
    }

    let rawTicket = await prisma.tickets.update({
      where: { id },
      data: updateData,
      include: ticketInclude,
    });

    if (assignedTo !== undefined) {
      await prisma.ticket_actors.deleteMany({
        where: { ticketId: id, role: "assignee", userId: { not: null } },
      });
      if (assignedTo) {
        await ensureAssigneeActor(id, assignedTo);
      }
      await syncPrimaryAssignee(id);
      rawTicket = await prisma.tickets.findUniqueOrThrow({
        where: { id },
        include: ticketInclude,
      });
    }

    const ticket = mapTicket(rawTicket);
    const nextStatus = (updateData.status as string | undefined) ?? status;

    if (
      assignedTo &&
      assignedTo !== existingTicket.assignedTo &&
      ticket.assignee?.email
    ) {
      const assigneeName = `${ticket.assignee.firstname} ${ticket.assignee.lastname}`;
      notifyTicketAssigned(
        existingTicket.title,
        id,
        ticket.assignee.email,
        ticket.assignee.userid,
        assigneeName,
      ).catch((e) =>
        logger.error("Failed to send ticket assignment notification", {
          error: e,
        }),
      );
    }

    if (
      nextStatus &&
      nextStatus !== existingTicket.status &&
      ticket.creator?.email
    ) {
      const creatorName = `${ticket.creator.firstname} ${ticket.creator.lastname}`;
      notifyTicketStatusChanged(
        existingTicket.title,
        id,
        ticket.creator.email,
        ticket.creator.userid,
        creatorName,
        existingTicket.status,
        nextStatus,
      ).catch((e) =>
        logger.error("Failed to send ticket status change notification", {
          error: e,
        }),
      );
    }

    return NextResponse.json(ticket, { status: 200 });
  } catch (error) {
    logger.error("PATCH /api/tickets/[id] error", { error });
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message.includes("Forbidden")) {
        return NextResponse.json(
          { error: "Forbidden: Admin access required" },
          { status: 403 },
        );
      }
    }
    return NextResponse.json(
      { error: "Failed to update ticket" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
