import type { Ticket } from "@/types/ticket";

const actorUserSelect = {
  userid: true,
  username: true,
  firstname: true,
  lastname: true,
  email: true,
} as const;

export const ticketInclude = {
  user_tickets_createdByTouser: {
    select: actorUserSelect,
  },
  user_tickets_assignedToTouser: {
    select: actorUserSelect,
  },
  user_tickets_solvedByTouser: {
    select: actorUserSelect,
  },
  asset: {
    select: {
      assetid: true,
      assetname: true,
      assettag: true,
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
  actors: {
    include: {
      user: { select: actorUserSelect },
      department: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" as const },
  },
  tasks: {
    include: {
      creator: { select: actorUserSelect },
      assignee: { select: actorUserSelect },
    },
    orderBy: { createdAt: "asc" as const },
  },
  validations: {
    include: {
      requester: { select: actorUserSelect },
      target: { select: actorUserSelect },
    },
    orderBy: { createdAt: "asc" as const },
  },
};

export function mapTicket(rawTicket: {
  user_tickets_createdByTouser: Ticket["creator"];
  user_tickets_assignedToTouser: Ticket["assignee"];
  user_tickets_solvedByTouser?: Ticket["solver"];
  asset?: Ticket["asset"];
  ticket_comments?: Ticket["comments"];
  actors?: Ticket["actors"];
  tasks?: Ticket["tasks"];
  validations?: Ticket["validations"];
  [key: string]: unknown;
}): Ticket {
  return {
    ...(rawTicket as unknown as Ticket),
    creator: rawTicket.user_tickets_createdByTouser,
    assignee: rawTicket.user_tickets_assignedToTouser,
    solver: rawTicket.user_tickets_solvedByTouser ?? null,
    asset: rawTicket.asset ?? null,
    comments: rawTicket.ticket_comments ?? [],
    actors: rawTicket.actors ?? [],
    tasks: rawTicket.tasks ?? [],
    validations: rawTicket.validations ?? [],
  };
}

export function ticketAccessWhere(
  user: { id?: string; isAdmin?: boolean; departmentId?: string | null },
  orgId?: string,
) {
  if (user.isAdmin) {
    return orgId
      ? { user_tickets_createdByTouser: { organizationId: orgId } }
      : {};
  }

  const clauses: Record<string, unknown>[] = [{ createdBy: user.id }];
  if (user.id) {
    clauses.push({ actors: { some: { userId: user.id } } });
    clauses.push({ validations: { some: { targetUserId: user.id } } });
  }
  if (user.departmentId) {
    clauses.push({
      actors: { some: { role: "assignee", departmentId: user.departmentId } },
    });
  }

  return {
    OR: clauses,
    ...(orgId
      ? { user_tickets_createdByTouser: { organizationId: orgId } }
      : {}),
  };
}
