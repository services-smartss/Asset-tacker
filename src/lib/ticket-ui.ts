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

/** Default names seeded into ticket_categories when an org has none. */
export const DEFAULT_TICKET_CATEGORY_NAMES = [
  "Hardware",
  "Software",
  "Network",
  "Access",
  "Printer",
  "Other",
] as const;

/** @deprecated Use ticket categories from /api/ticket-categories */
export const TICKET_CATEGORIES = DEFAULT_TICKET_CATEGORY_NAMES.map((name) => ({
  value: name,
  label: name,
}));

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
  "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide";

export const TICKET_STATUS_STYLES: Record<string, string> = {
  new: "bg-[#15803d] text-white",
  processing: "bg-[#c2410c] text-white",
  pending: "bg-[#57534e] text-white",
  solved: "bg-[#166534] text-white",
  closed: "bg-[#1C1F24] text-white",
  in_progress: "bg-[#c2410c] text-white",
  completed: "bg-[#166534] text-white",
  cancelled: "bg-[#1C1F24] text-white",
};

export const TICKET_STATUS_DOT_STYLES: Record<string, string> = {
  new: "bg-[hsl(var(--info))]",
  processing: "bg-[hsl(var(--warning))]",
  pending: "bg-muted-foreground",
  solved: "bg-[hsl(var(--success))]",
  closed: "bg-muted-foreground",
};

export const TICKET_TYPE_STYLES: Record<string, string> = {
  incident: "bg-[#dc2626] text-white",
  request: "bg-[#2563eb] text-white",
};

export const TICKET_PRIORITY_STYLES: Record<string, string> = {
  very_low: "bg-[#78716c] text-white",
  low: "bg-[#78716c] text-white",
  medium: "bg-[#57534e] text-white",
  high: "bg-[#c2410c] text-white",
  urgent: "bg-[#b91c1c] text-white",
};

export const TICKET_OVERDUE_CHIP = "bg-[#b91c1c] text-white";
export const TICKET_SLA_PAUSED_CHIP = "bg-[#57534e] text-white";

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

export function displayUserInitials(
  user:
    | { firstname: string; lastname: string }
    | string
    | null
    | undefined,
) {
  if (!user) return "?";
  if (typeof user === "string") {
    const parts = user.trim().split(/\s+/).filter(Boolean);
    return (
      `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase() || "?"
    );
  }
  return (
    `${user.firstname?.[0] ?? ""}${user.lastname?.[0] ?? ""}`.toUpperCase() ||
    "?"
  );
}

export function ticketActorNames(
  ticket: {
    createdBy?: string;
    creator?: { firstname: string; lastname: string } | null;
    assignee?: { firstname: string; lastname: string } | null;
    actors?: {
      role: string;
      user?: { firstname: string; lastname: string } | null;
      department?: { name: string } | null;
    }[];
  },
  role: string,
) {
  const named = (ticket.actors ?? [])
    .filter((actor) => actor.role === role)
    .map((actor) =>
      actor.user ? displayUserName(actor.user) : actor.department?.name,
    )
    .filter((name): name is string => Boolean(name));
  if (named.length > 0) return named.join(", ");
  if (role === "requester") return displayUserName(ticket.creator);
  if (role === "assignee") {
    return ticket.assignee ? displayUserName(ticket.assignee) : "—";
  }
  return "—";
}

export function isTimelineRequesterSide(
  ticket: {
    createdBy: string;
    actors?: { role: string; userId?: string | null }[];
  },
  userId: string | null | undefined,
  adminUserIds: Iterable<string> = [],
) {
  if (!userId) return true;
  const roles = (ticket.actors ?? [])
    .filter((actor) => actor.userId === userId)
    .map((actor) => actor.role);
  if (roles.includes("requester") || roles.includes("observer")) return true;
  if (roles.includes("assignee")) return false;
  if (ticket.createdBy === userId) return true;
  const admins = adminUserIds instanceof Set ? adminUserIds : new Set(adminUserIds);
  if (admins.has(userId)) return false;
  return true;
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

export function ticketSiteDepartmentId(
  ticket: {
    actors?: {
      role: string;
      departmentId?: string | null;
    }[];
  },
): string | null {
  const site = (ticket.actors ?? []).find(
    (actor) => actor.role === "assignee" && actor.departmentId,
  );
  return site?.departmentId ?? null;
}

export function ticketSiteDepartmentName(
  ticket: {
    actors?: {
      role: string;
      departmentId?: string | null;
      department?: { name: string } | null;
    }[];
  },
): string | null {
  const site = (ticket.actors ?? []).find(
    (actor) => actor.role === "assignee" && actor.departmentId,
  );
  return site?.department?.name ?? null;
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
