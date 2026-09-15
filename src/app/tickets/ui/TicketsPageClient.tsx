"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Kanban, Plus, Search, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "sonner";
import { NewTicketForm } from "@/app/user/tickets/ui/NewTicketForm";
import { TicketDetailPanel } from "./TicketDetailPanel";
import type { Ticket as TicketRecord, TicketAdminUser } from "@/types/ticket";
import {
  TICKET_CHIP_CLASS,
  TICKET_PRIORITIES,
  TICKET_PRIORITY_STYLES,
  TICKET_STATUSES,
  displayTicketAsset,
  displayTicketNumber,
  displayUserName,
  filterInboxTickets,
  ticketStatusLabel,
  ticketStatusStyle,
  type TicketQueue,
} from "@/lib/ticket-ui";
import { cn } from "@/lib/utils";

interface TicketsPageClientProps {
  tickets: TicketRecord[];
  isAdmin: boolean;
  currentUserId: string;
  adminUsers: TicketAdminUser[];
}

export default function TicketsPageClient({
  tickets: initialTickets,
  isAdmin,
  currentUserId,
  adminUsers,
}: TicketsPageClientProps) {
  const [tickets, setTickets] = useState<TicketRecord[]>(initialTickets);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialTickets[0]?.id ?? null,
  );
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [queue, setQueue] = useState<TicketQueue>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const filteredTickets = useMemo(
    () =>
      filterInboxTickets(tickets, {
        isAdmin,
        currentUserId,
        queue,
        searchQuery,
        statusFilter,
        priorityFilter,
      }),
    [
      tickets,
      isAdmin,
      currentUserId,
      queue,
      searchQuery,
      statusFilter,
      priorityFilter,
    ],
  );

  const selectedTicket =
    tickets.find((ticket) => ticket.id === selectedId) ?? null;
  const visibleSelected =
    selectedTicket &&
    filteredTickets.some((ticket) => ticket.id === selectedTicket.id)
      ? selectedTicket
      : null;

  const handleTicketCreated = (newTicket: TicketRecord) => {
    setTickets((prev) => [
      {
        ...newTicket,
        comments: newTicket.comments ?? [],
        type: newTicket.type ?? "incident",
        category: newTicket.category ?? null,
        asset: newTicket.asset ?? null,
        solution: newTicket.solution ?? null,
      },
      ...prev,
    ]);
    setSelectedId(newTicket.id);
    setShowNewTicketForm(false);
  };

  const handleUpdate = async (
    ticketId: string,
    updates: Partial<TicketRecord> & { solution?: string },
  ) => {
    const response = await fetch(`/api/tickets/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      toast.error("Failed to update ticket");
      throw new Error("Failed to update ticket");
    }

    const updatedTicket = (await response.json()) as TicketRecord;
    setTickets((prev) =>
      prev.map((ticket) =>
        ticket.id === ticketId
          ? { ...ticket, ...updatedTicket, comments: ticket.comments }
          : ticket,
      ),
    );
    if (!updates.solution) {
      toast.success("Ticket updated");
    }
  };

  const handleAddComment = async (ticketId: string, comment: string) => {
    const response = await fetch(`/api/tickets/${ticketId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment }),
    });

    if (!response.ok) {
      throw new Error("Failed to add comment");
    }

    const newComment = await response.json();
    setTickets((prev) =>
      prev.map((ticket) => {
        if (ticket.id !== ticketId) return ticket;
        const next: TicketRecord = {
          ...ticket,
          comments: [...ticket.comments, newComment],
        };
        if (isAdmin && !ticket.assignedTo && ticket.status === "new") {
          next.assignedTo = currentUserId;
          next.status = "processing";
          const me = adminUsers.find((admin) => admin.userid === currentUserId);
          if (me) {
            next.assignee = {
              userid: me.userid,
              username: me.username,
              firstname: me.firstname,
              lastname: me.lastname,
            };
          }
        }
        return next;
      }),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tickets</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Open, assign, and reply to support requests in one inbox
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/tickets">
                <Kanban className="h-4 w-4" />
                <span className="ml-2">Board</span>
              </Link>
            </Button>
          )}
          <Button size="sm" onClick={() => setShowNewTicketForm(true)}>
            <Plus className="h-4 w-4" />
            <span className="ml-2">New Ticket</span>
          </Button>
        </div>
      </div>

      {showNewTicketForm && (
        <NewTicketForm
          onTicketCreated={handleTicketCreated}
          onCancel={() => setShowNewTicketForm(false)}
        />
      )}

      {isAdmin && (
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "All"],
              ["open", "Open"],
              ["unassigned", "Unassigned"],
              ["mine", "Assigned to me"],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={queue === value ? "default" : "outline"}
              onClick={() => setQueue(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]" aria-label="Filter by status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {TICKET_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger
              className="w-[150px]"
              aria-label="Filter by priority"
            >
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              {TICKET_PRIORITIES.map((priority) => (
                <SelectItem key={priority.value} value={priority.value}>
                  {priority.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card overflow-hidden rounded-lg border">
        {filteredTickets.length === 0 ? (
          <EmptyState
            icon={<Ticket className="h-10 w-10" />}
            title="No tickets found"
            description={
              tickets.length === 0
                ? "Create a ticket to start the helpdesk queue."
                : "Try a different queue or filter."
            }
            action={
              tickets.length === 0 ? (
                <Button size="sm" onClick={() => setShowNewTicketForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Ticket
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="flex min-h-[32rem] md:h-[min(40rem,70vh)]">
            <div
              className={cn(
                "w-full overflow-y-auto md:w-96 md:shrink-0 md:border-r",
                visibleSelected && "hidden md:block",
              )}
            >
              <p className="text-muted-foreground border-b px-4 py-2 text-xs">
                {filteredTickets.length} ticket
                {filteredTickets.length === 1 ? "" : "s"}
              </p>
              <ul role="listbox" aria-label="Tickets">
                {filteredTickets.map((ticket) => {
                  const isSelected = ticket.id === selectedId;
                  return (
                    <li key={ticket.id}>
                      <button
                        type="button"
                        role="option"
                        onClick={() => setSelectedId(ticket.id)}
                        aria-selected={isSelected}
                        className={cn(
                          "w-full border-b px-4 py-3 text-left transition-colors",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted/50",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p
                              className={cn(
                                "font-mono text-[11px]",
                                isSelected
                                  ? "text-primary-foreground/70"
                                  : "text-muted-foreground",
                              )}
                            >
                              #{displayTicketNumber(ticket)}
                            </p>
                            <p className="truncate text-sm font-medium">
                              {ticket.title}
                            </p>
                            <p
                              className={cn(
                                "mt-1 truncate text-xs",
                                isSelected
                                  ? "text-primary-foreground/80"
                                  : "text-foreground",
                              )}
                            >
                              {displayTicketAsset(ticket.asset)}
                            </p>
                            <p
                              className={cn(
                                "mt-1 truncate text-[11px]",
                                isSelected
                                  ? "text-primary-foreground/70"
                                  : "text-muted-foreground",
                              )}
                            >
                              {displayUserName(ticket.creator)}
                              {ticket.assignee
                                ? ` · ${displayUserName(ticket.assignee)}`
                                : " · Unassigned"}
                              {ticket.category ? ` · ${ticket.category}` : ""}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <span
                              className={`${TICKET_CHIP_CLASS} ${ticketStatusStyle(ticket.status)}`}
                            >
                              {ticketStatusLabel(ticket.status)}
                            </span>
                            <span
                              className={`${TICKET_CHIP_CLASS} capitalize ${TICKET_PRIORITY_STYLES[ticket.priority] || TICKET_PRIORITY_STYLES.medium}`}
                            >
                              {ticket.priority}
                            </span>
                          </div>
                        </div>
                        <p
                          className={cn(
                            "mt-2 text-[11px]",
                            isSelected
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground",
                          )}
                        >
                          Updated {new Date(ticket.updatedAt).toLocaleString()}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div
              className={cn(
                "min-w-0 flex-1",
                !visibleSelected && "hidden md:flex",
                visibleSelected && "flex",
              )}
            >
              {visibleSelected ? (
                <TicketDetailPanel
                  ticket={visibleSelected}
                  isAdmin={isAdmin}
                  adminUsers={adminUsers}
                  onBack={() => setSelectedId(null)}
                  onUpdate={handleUpdate}
                  onAddComment={handleAddComment}
                />
              ) : (
                <EmptyState
                  compact
                  title="Select a ticket"
                  description="Choose a request from the queue to assign, update status, or reply."
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
