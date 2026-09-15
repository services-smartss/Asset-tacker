import prisma from "@/lib/prisma";
import {
  DEFAULT_TTO_MINUTES,
  DEFAULT_TTR_MINUTES,
  computePriority,
  slaDueFrom,
} from "@/lib/ticket-ui";

const actorUserSelect = {
  userid: true,
  username: true,
  firstname: true,
  lastname: true,
  email: true,
} as const;

export async function ensureSlaPolicy(organizationId: string | null | undefined) {
  if (!organizationId) {
    return {
      id: null as string | null,
      ttoMinutes: DEFAULT_TTO_MINUTES,
      ttrMinutes: DEFAULT_TTR_MINUTES,
      pauseOnPending: true,
    };
  }

  return prisma.ticket_sla_policies.upsert({
    where: { organizationId },
    create: {
      organizationId,
      name: "Default",
      ttoMinutes: DEFAULT_TTO_MINUTES,
      ttrMinutes: DEFAULT_TTR_MINUTES,
      pauseOnPending: true,
    },
    update: {},
  });
}

export function slaDatesForCreate(
  start: Date,
  policy: { ttoMinutes: number; ttrMinutes: number },
) {
  return {
    timeToOwn: slaDueFrom(start, policy.ttoMinutes),
    timeToResolve: slaDueFrom(start, policy.ttrMinutes),
  };
}

export function parsedScale(value: unknown, fallback = 3) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(5, Math.max(1, Math.round(numeric)));
}

export function priorityFromBody(body: {
  urgency?: unknown;
  impact?: unknown;
}) {
  const urgency = parsedScale(body.urgency, 3);
  const impact = parsedScale(body.impact, 3);
  return {
    urgency,
    impact,
    priority: computePriority(urgency, impact),
  };
}

export async function syncPrimaryAssignee(ticketId: string) {
  const assignee = await prisma.ticket_actors.findFirst({
    where: { ticketId, role: "assignee", userId: { not: null } },
    orderBy: { createdAt: "asc" },
    select: { userId: true },
  });

  await prisma.tickets.update({
    where: { id: ticketId },
    data: {
      assignedTo: assignee?.userId ?? null,
      updatedAt: new Date(),
    },
  });
}

export async function ensureRequesterActor(ticketId: string, userId: string) {
  const existing = await prisma.ticket_actors.findFirst({
    where: { ticketId, role: "requester", userId },
  });
  if (existing) return existing;
  return prisma.ticket_actors.create({
    data: { ticketId, role: "requester", userId },
  });
}

export async function ensureAssigneeActor(ticketId: string, userId: string) {
  const existing = await prisma.ticket_actors.findFirst({
    where: { ticketId, role: "assignee", userId },
  });
  if (existing) return existing;
  return prisma.ticket_actors.create({
    data: { ticketId, role: "assignee", userId },
  });
}

export { actorUserSelect };
