export const TICKET_STATUSES = [
  { value: "new", label: "New" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export const TICKET_PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
] as const;

export const TICKET_STATUS_STYLES: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 border-blue-300",
  in_progress: "bg-yellow-100 text-yellow-800 border-yellow-300",
  completed: "bg-green-100 text-green-800 border-green-300",
  cancelled: "bg-gray-100 text-gray-800 border-gray-300",
};

export const TICKET_PRIORITY_STYLES: Record<string, string> = {
  low: "bg-gray-100 text-gray-800 border-gray-300",
  medium: "bg-blue-100 text-blue-800 border-blue-300",
  high: "bg-orange-100 text-orange-800 border-orange-300",
  urgent: "bg-red-100 text-red-800 border-red-300",
};

export function ticketStatusLabel(status: string) {
  return TICKET_STATUSES.find((item) => item.value === status)?.label ?? status;
}

export function shortTicketId(id: string) {
  return id.replace(/-/g, "").slice(0, 8);
}

export function displayUserName(
  user: { firstname: string; lastname: string } | null | undefined,
) {
  if (!user) return "Unassigned";
  return `${user.firstname} ${user.lastname}`.trim();
}

export type TicketQueue = "all" | "unassigned" | "mine" | "open";

const OPEN_STATUSES = new Set(["new", "in_progress"]);

export function filterInboxTickets<
  T extends {
    id: string;
    title: string;
    description: string | null;
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

  return tickets.filter((ticket) => {
    if (options.isAdmin) {
      if (options.queue === "unassigned" && ticket.assignedTo) return false;
      if (options.queue === "mine" && ticket.assignedTo !== options.currentUserId)
        return false;
      if (options.queue === "open" && !OPEN_STATUSES.has(ticket.status))
        return false;
    }

    if (options.statusFilter !== "all" && ticket.status !== options.statusFilter) {
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
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  });
}
