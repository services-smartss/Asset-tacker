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
  { value: "very_low", label: "Very low" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
] as const;

export const TICKET_SCALE = [
  { value: 1, label: "Very low" },
  { value: 2, label: "Low" },
  { value: 3, label: "Medium" },
  { value: 4, label: "High" },
  { value: 5, label: "Very high" },
] as const;

export const DEFAULT_TTO_MINUTES = 8 * 60;
export const DEFAULT_TTR_MINUTES = 24 * 60;

const PRIORITY_FROM_LEVEL = {
  1: "very_low",
  2: "low",
  3: "medium",
  4: "high",
  5: "urgent",
} as const;

export const TICKET_CHIP_CLASS =
  "rounded-md border px-2 py-0.5 text-[10px] font-medium";

const STATUS_INFO = "bg-info-bg text-info-foreground border-transparent";
const STATUS_WARNING =
  "bg-warning-bg text-warning-foreground border-transparent";
const STATUS_SUCCESS =
  "bg-success-bg text-success-foreground border-transparent";
const STATUS_MUTED = "bg-muted text-muted-foreground border-border";

export const TICKET_STATUS_STYLES: Record<string, string> = {
  new: STATUS_INFO,
  processing: STATUS_WARNING,
  pending: STATUS_MUTED,
  solved: STATUS_SUCCESS,
  closed: STATUS_MUTED,
  in_progress: STATUS_WARNING,
  completed: STATUS_SUCCESS,
  cancelled: STATUS_MUTED,
};

export const TICKET_STATUS_DOT_STYLES: Record<string, string> = {
  new: "bg-[hsl(var(--info))]",
  processing: "bg-[hsl(var(--warning))]",
  pending: "bg-muted-foreground",
  solved: "bg-[hsl(var(--success))]",
  closed: "bg-muted-foreground",
};

export const TICKET_TYPE_STYLES: Record<string, string> = {
  incident: "bg-destructive/10 text-destructive border-destructive/30",
  request: "bg-background text-foreground border-border",
};

export const TICKET_PRIORITY_STYLES: Record<string, string> = {
  very_low: STATUS_MUTED,
  low: STATUS_MUTED,
  medium: STATUS_INFO,
  high: STATUS_WARNING,
  urgent: "bg-destructive/10 text-destructive border-destructive/30",
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

export function ticketPriorityLabel(priority: string) {
  return (
    TICKET_PRIORITIES.find((item) => item.value === priority)?.label ?? priority
  );
}

export function ticketScaleLabel(value: number) {
  return (
    TICKET_SCALE.find((item) => item.value === value)?.label ?? String(value)
  );
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

export function displayTicketAsset(
  asset: { assettag: string; assetname: string } | null | undefined,
) {
  if (!asset) return "No item";
  return `${asset.assettag} — ${asset.assetname}`;
}

export function ticketStatusStyle(status: string) {
  const normalized = normalizeTicketStatus(status);
  return TICKET_STATUS_STYLES[normalized] ?? TICKET_STATUS_STYLES.new;
}

export function ticketStatusDotStyle(status: string) {
  const normalized = normalizeTicketStatus(status);
  return TICKET_STATUS_DOT_STYLES[normalized] ?? TICKET_STATUS_DOT_STYLES.new;
}

export type TicketPriorityValue = (typeof TICKET_PRIORITIES)[number]["value"];

export function clampTicketScale(value: number) {
  if (!Number.isFinite(value)) return 3;
  return Math.min(5, Math.max(1, Math.round(value)));
}

export function computePriorityLevel(urgency: number, impact: number) {
  return clampTicketScale(
    Math.round((clampTicketScale(urgency) + clampTicketScale(impact)) / 2),
  ) as 1 | 2 | 3 | 4 | 5;
}

export function computePriority(
  urgency: number,
  impact: number,
): TicketPriorityValue {
  return PRIORITY_FROM_LEVEL[computePriorityLevel(urgency, impact)];
}

export function slaDueFrom(start: Date, minutes: number) {
  return new Date(start.getTime() + minutes * 60_000);
}

export function applySlaPause(options: {
  status: string;
  nextStatus: string;
  timeToOwn: Date | string | null | undefined;
  timeToResolve: Date | string | null | undefined;
  slaPausedAt: Date | string | null | undefined;
  pauseOnPending?: boolean;
  now?: Date;
}) {
  const now = options.now ?? new Date();
  const current = normalizeTicketStatus(options.status);
  const next = normalizeTicketStatus(options.nextStatus);
  let timeToOwn = options.timeToOwn ? new Date(options.timeToOwn) : null;
  let timeToResolve = options.timeToResolve
    ? new Date(options.timeToResolve)
    : null;
  let slaPausedAt = options.slaPausedAt ? new Date(options.slaPausedAt) : null;
  const pauseOnPending = options.pauseOnPending !== false;

  if (!pauseOnPending || current === next) {
    return { timeToOwn, timeToResolve, slaPausedAt };
  }

  if (current !== "pending" && next === "pending") {
    slaPausedAt = now;
  }

  if (current === "pending" && next !== "pending" && slaPausedAt) {
    const elapsed = now.getTime() - slaPausedAt.getTime();
    if (timeToOwn) timeToOwn = new Date(timeToOwn.getTime() + elapsed);
    if (timeToResolve) timeToResolve = new Date(timeToResolve.getTime() + elapsed);
    slaPausedAt = null;
  }

  return { timeToOwn, timeToResolve, slaPausedAt };
}

export function ticketSlaState(
  ticket: {
    status: string;
    timeToResolve?: Date | string | null;
    slaPausedAt?: Date | string | null;
  },
  now = new Date(),
) {
  const status = normalizeTicketStatus(ticket.status);
  if (status === "solved" || status === "closed") return "done";
  if (status === "pending" && ticket.slaPausedAt) return "paused";
  if (ticket.timeToResolve && new Date(ticket.timeToResolve) < now) {
    return "overdue";
  }
  return "ok";
}

export type TicketActorLike = {
  role: string;
  userId?: string | null;
  departmentId?: string | null;
};

export function isTicketAssignedToUser(
  ticket: {
    assignedTo: string | null;
    actors?: TicketActorLike[];
  },
  userId: string,
  departmentId?: string | null,
) {
  if (ticket.assignedTo === userId) return true;
  return (ticket.actors ?? []).some(
    (actor) =>
      actor.role === "assignee" &&
      (actor.userId === userId ||
        (departmentId && actor.departmentId === departmentId)),
  );
}

export function isTicketUnassigned(ticket: {
  assignedTo: string | null;
  actors?: TicketActorLike[];
}) {
  if (ticket.assignedTo) return false;
  return !(ticket.actors ?? []).some((actor) => actor.role === "assignee");
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
    asset?: { assettag: string; assetname: string } | null;
    actors?: TicketActorLike[];
  },
>(
  tickets: T[],
  options: {
    isAdmin: boolean;
    currentUserId: string;
    currentDepartmentId?: string | null;
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
      if (options.queue === "unassigned" && !isTicketUnassigned(ticket)) {
        return false;
      }
      if (
        options.queue === "mine" &&
        !isTicketAssignedToUser(
          ticket,
          options.currentUserId,
          options.currentDepartmentId,
        )
      ) {
        return false;
      }
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
        ticket.asset?.assettag ?? "",
        ticket.asset?.assetname ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  });
}
