import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { requireApiAuth, requireNotDemoMode } from "@/lib/api-auth";
import { createFreshdeskClient, SUPPORTED_TICKET_TYPES } from "@/lib/freshdesk";
import { decrypt } from "@/lib/encryption";
import { getOrganizationContext } from "@/lib/organization-context";
import {
  parsePaginationParams,
  buildPrismaArgs,
  buildPaginatedResponse,
} from "@/lib/pagination";
import { mapTicket, ticketAccessWhere, ticketInclude } from "@/lib/ticket-query";
import { uuidSchema } from "@/lib/validation";
import { logger } from "@/lib/logger";
import {
  ensureSlaPolicy,
  priorityFromBody,
  slaDatesForCreate,
} from "@/lib/ticket-itsm";

const TICKET_SORT_FIELDS = [
  "title",
  "status",
  "priority",
  "createdAt",
  "updatedAt",
];

// Supports two sources:
// - Default (local): Returns tickets from the local database based on user role
// - Freshdesk (?source=freshdesk): Returns tickets from Freshdesk API
export async function GET(req: Request) {
  const url = new URL(req.url);
  const source = url.searchParams.get("source");

  if (source === "freshdesk") {
    return getFreshdeskTickets(req, url);
  }

  return getLocalTickets(url);
}

async function getLocalTickets(url: URL) {
  try {
    const user = await requireApiAuth();
    const searchParams = url.searchParams;

    // Scope tickets to user's organization (through creator's org)
    const orgContext = await getOrganizationContext();
    const orgId = orgContext?.organization?.id;
    const where: Record<string, unknown> = ticketAccessWhere(user, orgId);

    const include = ticketInclude;

    // If no `page` param, return all results for backward compatibility
    if (!searchParams.has("page")) {
      const rawTickets = await prisma.tickets.findMany({
        where,
        include,
        orderBy: { createdAt: "desc" },
      });

      const tickets = rawTickets.map((ticket) => mapTicket(ticket));

      return NextResponse.json(tickets, { status: 200 });
    }

    // Paginated path
    const params = parsePaginationParams(searchParams);
    const prismaArgs = buildPrismaArgs(params, TICKET_SORT_FIELDS);

    // Search filter
    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: "insensitive" } },
        { description: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const [rawTickets, total] = await Promise.all([
      prisma.tickets.findMany({ where, include, ...prismaArgs }),
      prisma.tickets.count({ where }),
    ]);

    const tickets = rawTickets.map((ticket) => mapTicket(ticket));

    return NextResponse.json(buildPaginatedResponse(tickets, total, params), {
      status: 200,
    });
  } catch (error) {
    logger.error("GET /api/tickets error", { error });
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch tickets" },
      { status: 500 },
    );
  }
}

// Fetch tickets from Freshdesk API (admin-only)
async function getFreshdeskTickets(req: Request, url: URL) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.isadmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const typeFilter = url.searchParams.get("type");

    // Decrypt the API key (may be encrypted at rest)
    const client = createFreshdeskClient({
      domain: domainSetting.settingValue,
      apiKey: decrypt(apiKeySetting.settingValue),
    });

    // Determine which types to filter
    const types = typeFilter ? [typeFilter] : [...SUPPORTED_TICKET_TYPES];

    const result = await client.getTicketsByTypes(types, page);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to fetch tickets" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      tickets: result.data || [],
      page,
      types: SUPPORTED_TICKET_TYPES,
    });
  } catch (error) {
    logger.error("GET /api/tickets (freshdesk) error", { error });
    return NextResponse.json(
      { error: "Failed to fetch tickets" },
      { status: 500 },
    );
  }
}

// POST /api/tickets
// Create a new ticket (any authenticated user can create)
export async function POST(req: Request) {
  try {
    const demoBlock = requireNotDemoMode();
    if (demoBlock) return demoBlock;

    const user = await requireApiAuth();
    const body = await req.json();

    const { title, description, type, category, assetId, urgency, impact, siteDepartmentId } =
      body || {};

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const ticketType = type === "request" ? "request" : "incident";
    const linkedAssetId =
      typeof assetId === "string" && uuidSchema.safeParse(assetId).success
        ? assetId
        : null;
    const siteDeptId =
      typeof siteDepartmentId === "string" &&
      uuidSchema.safeParse(siteDepartmentId).success
        ? siteDepartmentId
        : null;

    if (linkedAssetId) {
      const asset = await prisma.asset.findUnique({
        where: { assetid: linkedAssetId },
        select: { assetid: true },
      });
      if (!asset) {
        return NextResponse.json({ error: "Asset not found" }, { status: 400 });
      }
    }

    const orgContext = await getOrganizationContext();
    const orgId = user.organizationId ?? orgContext?.organization?.id;

    if (siteDeptId) {
      const department = await prisma.department.findFirst({
        where: {
          id: siteDeptId,
          ...(orgId ? { organizationId: orgId } : {}),
        },
        select: { id: true },
      });
      if (!department) {
        return NextResponse.json(
          { error: "Site department not found" },
          { status: 400 },
        );
      }
    }

    const matrix = priorityFromBody({ urgency, impact });
    const policy = await ensureSlaPolicy(orgId);
    const now = new Date();
    const sla = slaDatesForCreate(now, policy);

    const rawTicket = await prisma.tickets.create({
      data: {
        title,
        description: description || null,
        priority: matrix.priority,
        urgency: matrix.urgency,
        impact: matrix.impact,
        type: ticketType,
        category: category || null,
        timeToOwn: sla.timeToOwn,
        timeToResolve: sla.timeToResolve,
        ...(policy.id ? { slaPolicy: { connect: { id: policy.id } } } : {}),
        user_tickets_createdByTouser: {
          connect: { userid: user.id! },
        },
        actors: {
          create: [
            {
              role: "requester",
              userId: user.id!,
            },
            ...(siteDeptId
              ? [
                  {
                    role: "assignee" as const,
                    departmentId: siteDeptId,
                  },
                ]
              : []),
          ],
        },
        ...(linkedAssetId
          ? { asset: { connect: { assetid: linkedAssetId } } }
          : {}),
        status: "new",
        updatedAt: now,
      },
      include: ticketInclude,
    });

    return NextResponse.json(mapTicket(rawTicket), { status: 201 });
  } catch (error) {
    logger.error("POST /api/tickets error", { error });
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to create ticket" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
