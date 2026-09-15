import type { Ticket } from "@/types/ticket";

export const ticketInclude = {
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
  user_tickets_solvedByTouser: {
    select: {
      userid: true,
      username: true,
      firstname: true,
      lastname: true,
      email: true,
    },
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
};

export function mapTicket(rawTicket: {
  user_tickets_createdByTouser: Ticket["creator"];
  user_tickets_assignedToTouser: Ticket["assignee"];
  user_tickets_solvedByTouser?: Ticket["solver"];
  asset?: Ticket["asset"];
  ticket_comments?: Ticket["comments"];
  [key: string]: unknown;
}): Ticket {
  return {
    ...(rawTicket as unknown as Ticket),
    creator: rawTicket.user_tickets_createdByTouser,
    assignee: rawTicket.user_tickets_assignedToTouser,
    solver: rawTicket.user_tickets_solvedByTouser ?? null,
    asset: rawTicket.asset ?? null,
    comments: rawTicket.ticket_comments ?? [],
  };
}
