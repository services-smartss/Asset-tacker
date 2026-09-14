import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import {
  requireApiAdmin,
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

interface RouteParams {
  params: Promise<{ id: string }>;
}

const ticketInclude = {
  user_tickets_createdByTouser: {
    select: {
      userid: true,
      username: true,
      firstname: true,
      lastname: true,
      email: true,
    },
  },
  user_tickets_assignedToTouser: {
    select: {
      userid: true,
      username: true,
      firstname: true,
      lastname: true,
      email: true,
    },
  },
  ticket_comments: {
    include: {
      user: {
        select: {
          userid: true,
          username: true,
          firstname: true,
          lastname: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc" as const,
    },
  },
};

function mapTicket<
  T extends {
    user_tickets_createdByTouser: {
      userid: string;
      username: string | null;
      firstname: string;
      lastname: string;
      email: string | null;
    };
    user_tickets_assignedToTouser: {
      userid: string;
      username: string | null;
      firstname: string;
      lastname: string;
      email: string | null;
    } | null;
    ticket_comments: unknown[];
  },
>(rawTicket: T) {
  return {
    ...rawTicket,
    creator: rawTicket.user_tickets_createdByTouser,
    assignee: rawTicket.user_tickets_assignedToTouser,
    comments: rawTicket.ticket_comments,
  };
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
        ...(orgId
          ? { user_tickets_createdByTouser: { organizationId: orgId } }
          : {}),
      },
      include: ticketInclude,
    });

    if (!rawTicket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (!user.isAdmin && rawTicket.createdBy !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
// Update a local ticket (status, priority, assignedTo)
// Only admins can update tickets
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const demoBlock = requireNotDemoMode();
    if (demoBlock) return demoBlock;

    const _user = await requireApiAdmin();
    const { id } = await params;
    const body = await req.json();

    const { status, priority, assignedTo } = body || {};

    // Fetch the existing ticket and verify it belongs to admin's org
    const orgContext = await getOrganizationContext();
    const orgId = orgContext?.organization?.id;

    const existingTicket = await prisma.tickets.findFirst({
      where: {
        id,
        ...(orgId
          ? { user_tickets_createdByTouser: { organizationId: orgId } }
          : {}),
      },
      select: { status: true, assignedTo: true, title: true },
    });

    if (!existingTicket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;

    const rawTicket = await prisma.tickets.update({
      where: { id },
      data: updateData,
      include: ticketInclude,
    });

    const ticket = mapTicket(rawTicket);

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

    if (status && status !== existingTicket.status && ticket.creator?.email) {
      const creatorName = `${ticket.creator.firstname} ${ticket.creator.lastname}`;
      notifyTicketStatusChanged(
        existingTicket.title,
        id,
        ticket.creator.email,
        ticket.creator.userid,
        creatorName,
        existingTicket.status,
        status,
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
