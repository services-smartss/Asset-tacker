import { describe, expect, it } from "vitest";
import {
  displayTicketAsset,
  displayTicketNumber,
  displayUserName,
  filterInboxTickets,
  shortTicketId,
  ticketStatusLabel,
  ticketTypeLabel,
} from "../ticket-ui";

const adminId = "admin-1";
const tickets = [
  {
    id: "550e8400-e29b-41d4-a716-446655440000",
    ticketNumber: 12,
    title: "Laptop will not boot",
    description: "Black screen after login",
    type: "incident",
    category: "Hardware",
    status: "new",
    priority: "high",
    assignedTo: null,
    creator: { firstname: "Ada", lastname: "Lovelace" },
    asset: { assettag: "LT-104", assetname: "ThinkPad T14" },
  },
  {
    id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    ticketNumber: 13,
    title: "Need extra monitor",
    description: "Docking station request",
    type: "request",
    category: "Hardware",
    status: "processing",
    priority: "medium",
    assignedTo: adminId,
    creator: { firstname: "Grace", lastname: "Hopper" },
  },
  {
    id: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    ticketNumber: 14,
    title: "Printer jam",
    description: null,
    type: "incident",
    category: "Printer",
    status: "solved",
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

  it("shows a sequential ticket number", () => {
    expect(displayTicketNumber(tickets[0])).toBe("12");
    expect(displayTicketNumber({ id: tickets[0].id })).toBe("550e8400");
  });

  it("labels GLPI ticket status and type", () => {
    expect(ticketStatusLabel("processing")).toBe("Processing");
    expect(ticketStatusLabel("in_progress")).toBe("Processing");
    expect(ticketStatusLabel("completed")).toBe("Solved");
    expect(ticketStatusLabel("unknown")).toBe("unknown");
    expect(ticketTypeLabel("incident")).toBe("Incident");
    expect(ticketTypeLabel("request")).toBe("Request");
  });

  it("formats a linked asset for the inbox row", () => {
    expect(displayTicketAsset(tickets[0].asset)).toBe("LT-104 — ThinkPad T14");
    expect(displayTicketAsset(null)).toBe("No item");
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
      filterInboxTickets(tickets, { ...baseOptions, statusFilter: "solved" }),
    ).toHaveLength(1);
    expect(
      filterInboxTickets(tickets, {
        ...baseOptions,
        statusFilter: "completed",
      }),
    ).toHaveLength(1);
    expect(
      filterInboxTickets(tickets, { ...baseOptions, priorityFilter: "high" }),
    ).toHaveLength(1);
    expect(
      filterInboxTickets(tickets, { ...baseOptions, searchQuery: "ada" }),
    ).toHaveLength(1);
    expect(
      filterInboxTickets(tickets, { ...baseOptions, searchQuery: "12" }),
    ).toHaveLength(1);
    expect(
      filterInboxTickets(tickets, { ...baseOptions, searchQuery: "incident" }),
    ).toHaveLength(2);
    expect(
      filterInboxTickets(tickets, { ...baseOptions, searchQuery: "LT-104" }),
    ).toHaveLength(1);
    expect(
      filterInboxTickets(tickets, {
        ...baseOptions,
        searchQuery: "thinkpad",
      }),
    ).toHaveLength(1);
  });
});
