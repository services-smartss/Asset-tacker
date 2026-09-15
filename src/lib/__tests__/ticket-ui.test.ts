import { describe, expect, it } from "vitest";
import {
  applySlaPause,
  computePriority,
  computePriorityLevel,
  displayTicketAsset,
  displayTicketNumber,
  displayUserName,
  filterInboxTickets,
  isTicketAssignedToUser,
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

  it("computes GLPI fallback priority from urgency and impact", () => {
    expect(computePriorityLevel(3, 3)).toBe(3);
    expect(computePriority(3, 3)).toBe("medium");
    expect(computePriority(5, 5)).toBe("urgent");
    expect(computePriority(1, 1)).toBe("very_low");
    expect(computePriority(2, 5)).toBe("high");
    expect(computePriority(0, 9)).toBe("medium");
  });

  it("pauses and resumes SLA due dates on pending", () => {
    const start = new Date("2026-09-15T00:00:00.000Z");
    const own = new Date("2026-09-15T08:00:00.000Z");
    const resolve = new Date("2026-09-16T00:00:00.000Z");
    const paused = applySlaPause({
      status: "processing",
      nextStatus: "pending",
      timeToOwn: own,
      timeToResolve: resolve,
      slaPausedAt: null,
      now: start,
    });
    expect(paused.slaPausedAt?.toISOString()).toBe(start.toISOString());

    const resumed = applySlaPause({
      status: "pending",
      nextStatus: "processing",
      timeToOwn: own,
      timeToResolve: resolve,
      slaPausedAt: start,
      now: new Date("2026-09-15T02:00:00.000Z"),
    });
    expect(resumed.slaPausedAt).toBeNull();
    expect(resumed.timeToOwn?.toISOString()).toBe("2026-09-15T10:00:00.000Z");
    expect(resumed.timeToResolve?.toISOString()).toBe(
      "2026-09-16T02:00:00.000Z",
    );
  });

  it("treats department assignees as mine", () => {
    const deptTicket = {
      ...tickets[0],
      assignedTo: null,
      actors: [{ role: "assignee", departmentId: "dept-it", userId: null }],
    };
    expect(isTicketAssignedToUser(deptTicket, adminId, "dept-it")).toBe(true);
    expect(
      filterInboxTickets([deptTicket], {
        ...baseOptions,
        queue: "mine",
        currentDepartmentId: "dept-it",
      }),
    ).toHaveLength(1);
    expect(
      filterInboxTickets([deptTicket], {
        ...baseOptions,
        queue: "unassigned",
        currentDepartmentId: "dept-it",
      }),
    ).toHaveLength(0);
  });
});
