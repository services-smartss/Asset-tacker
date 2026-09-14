import { describe, expect, it } from "vitest";
import {
  displayUserName,
  filterInboxTickets,
  shortTicketId,
  ticketStatusLabel,
} from "../ticket-ui";

const adminId = "admin-1";
const tickets = [
  {
    id: "550e8400-e29b-41d4-a716-446655440000",
    title: "Laptop will not boot",
    description: "Black screen after login",
    status: "new",
    priority: "high",
    assignedTo: null,
    creator: { firstname: "Ada", lastname: "Lovelace" },
  },
  {
    id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    title: "Need extra monitor",
    description: "Docking station request",
    status: "in_progress",
    priority: "medium",
    assignedTo: adminId,
    creator: { firstname: "Grace", lastname: "Hopper" },
  },
  {
    id: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    title: "Printer jam",
    description: null,
    status: "completed",
    priority: "low",
    assignedTo: "other-admin",
    creator: { firstname: "Alan", lastname: "Turing" },
  },
];

const baseOptions = {
  isAdmin: true,
  currentUserId: adminId,
  queue: "all" as const,
  searchQuery: "",
  statusFilter: "all",
  priorityFilter: "all",
};

describe("ticket-ui", () => {
  it("shortens a UUID for inbox display", () => {
    expect(shortTicketId(tickets[0].id)).toBe("550e8400");
  });

  it("labels ticket status", () => {
    expect(ticketStatusLabel("in_progress")).toBe("In Progress");
    expect(ticketStatusLabel("unknown")).toBe("unknown");
  });

  it("formats a user name", () => {
    expect(displayUserName(tickets[0].creator)).toBe("Ada Lovelace");
    expect(displayUserName(null)).toBe("Unassigned");
  });

  it("filters admin queues", () => {
    expect(
      filterInboxTickets(tickets, { ...baseOptions, queue: "unassigned" }).map(
        (ticket) => ticket.title,
      ),
    ).toEqual(["Laptop will not boot"]);

    expect(
      filterInboxTickets(tickets, { ...baseOptions, queue: "mine" }).map(
        (ticket) => ticket.title,
      ),
    ).toEqual(["Need extra monitor"]);

    expect(
      filterInboxTickets(tickets, { ...baseOptions, queue: "open" }).map(
        (ticket) => ticket.title,
      ),
    ).toEqual(["Laptop will not boot", "Need extra monitor"]);
  });

  it("ignores admin queues for requesters", () => {
    expect(
      filterInboxTickets(tickets, {
        ...baseOptions,
        isAdmin: false,
        queue: "unassigned",
      }),
    ).toHaveLength(3);
  });

  it("filters by status, priority, and search", () => {
    expect(
      filterInboxTickets(tickets, { ...baseOptions, statusFilter: "completed" }),
    ).toHaveLength(1);
    expect(
      filterInboxTickets(tickets, { ...baseOptions, priorityFilter: "high" }),
    ).toHaveLength(1);
    expect(
      filterInboxTickets(tickets, { ...baseOptions, searchQuery: "ada" }),
    ).toHaveLength(1);
    expect(
      filterInboxTickets(tickets, { ...baseOptions, searchQuery: "550e8400" }),
    ).toHaveLength(1);
  });
});
