export const TICKET_STATUSES = [
  { value: "new", label: "New" },
  { value: "processing", label: "Processing" },
  { value: "pending", label: "Pending" },
  { value: "solved", label: "Solved" },
  { value: "closed", label: "Closed" },
] as const;

export const TICKET_TYPES = [
  { value: "incident", label: "Incident" },
  { value: "request", label: "Request" },
] as const;

export const TICKET_CATEGORIES = [
  { value: "Hardware", label: "Hardware" },
  { value: "Software", label: "Software" },
  { value: "Network", label: "Network" },
  { value: "Access", label: "Access" },
  { value: "Printer", label: "Printer" },
  { value: "Other", label: "Other" },
] as const;

export const TICKET_PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
] as const;

export const TICKET_STATUS_STYLES: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 border-blue-300",
  processing: "bg-yellow-100 text-yellow-800 border-yellow-300",
  pending: "bg-purple-100 text-purple-800 border-purple-300",
  solved: "bg-green-100 text-green-800 border-green-300",
  closed: "bg-gray-100 text-gray-800 border-gray-300",
  in_progress: "bg-yellow-100 text-yellow-800 border-yellow-300",
  completed: "bg-green-100 text-green-800 border-green-300",
  cancelled: "bg-gray-100 text-gray-800 border-gray-300",
};

export const TICKET_TYPE_STYLES: Record<string, string> = {
  incident: "bg-red-100 text-red-800 border-red-300",
  request: "bg-sky-100 text-sky-800 border-sky-300",
};

export const TICKET_PRIORITY_STYLES: Record<string, string> = {
  low: "bg-gray-100 text-gray-800 border-gray-300",
  medium: "bg-blue-100 text-blue-800 border-blue-300",
  high: "bg-orange-100 text-orange-800 border-orange-300",
  urgent: "bg-red-100 text-red-800 border-red-300",
};

export function normalizeTicketStatus(status: string) {
  if (status === "in_progress") return "processing";
  if (status === "completed") return "solved";
  if (status === "cancelled") return "closed";
  return status;
}

export function ticketStatusLabel(status: string) {
  const normalized = normalizeTicketStatus(status);
  return (
    TICKET_STATUSES.find((item) => item.value === normalized)?.label ?? status
  );
}

export function ticketTypeLabel(type: string) {
  return TICKET_TYPES.find((item) => item.value === type)?.label ?? type;
}

export function shortTicketId(id: string) {
  return id.replace(/-/g, "").slice(0, 8);
}

export function displayTicketNumber(ticket: {
  ticketNumber?: number | null;
  id: string;
}) {
  return ticket.ticketNumber != null
    ? String(ticket.ticketNumber)
    : shortTicketId(ticket.id);
}

export function displayUserName(
  user: { firstname: string; lastname: string } | null | undefined,
) {
  if (!user) return "Unassigned";
  return `${user.firstname} ${user.lastname}`.trim();
}

export type TicketQueue = "all" | "unassigned" | "mine" | "open";

const OPEN_STATUSES = new Set(["new", "processing", "pending", "in_progress"]);

export function filterInboxTickets<
  T extends {
    id: string;
    ticketNumber?: number | null;
    title: string;
    description: string | null;
    type?: string | null;
    category?: string | null;
    status: string;
    priority: string;
    assignedTo: string | null;
    creator: { firstname: string; lastname: string };
  },
>(
  tickets: T[],
  options: {
    isAdmin: boolean;
    currentUserId: string;
    queue: TicketQueue;
    searchQuery: string;
    statusFilter: string;
    priorityFilter: string;
  },
) {
  const query = options.searchQuery.trim().toLowerCase();
  const statusFilter = normalizeTicketStatus(options.statusFilter);

  return tickets.filter((ticket) => {
    const status = normalizeTicketStatus(ticket.status);

    if (options.isAdmin) {
      if (options.queue === "unassigned" && ticket.assignedTo) return false;
      if (options.queue === "mine" && ticket.assignedTo !== options.currentUserId)
        return false;
      if (options.queue === "open" && !OPEN_STATUSES.has(status)) return false;
    }

    if (statusFilter !== "all" && status !== statusFilter) {
      return false;
    }
    if (
      options.priorityFilter !== "all" &&
      ticket.priority !== options.priorityFilter
    ) {
      return false;
    }

    if (query) {
      const haystack = [
        ticket.title,
        ticket.description ?? "",
        displayUserName(ticket.creator),
        shortTicketId(ticket.id),
        displayTicketNumber(ticket),
        ticket.type ?? "",
        ticket.category ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  });
}
