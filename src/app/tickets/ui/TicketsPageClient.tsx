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
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "sonner";
import { useI18n } from "@/hooks/useI18n";
import { NewTicketForm } from "@/app/user/tickets/ui/NewTicketForm";
import { TicketDialog } from "./TicketDialog";
import type { Ticket as TicketRecord, TicketAdminUser, TicketDepartment } from "@/types/ticket";
import {
  TICKET_CHIP_CLASS,
  TICKET_OVERDUE_CHIP,
  TICKET_PRIORITIES,
  TICKET_PRIORITY_STYLES,
  TICKET_STATUSES,
  displayTicketAsset,
  displayTicketNumber,
  filterInboxTickets,
  normalizeTicketStatus,
  ticketActorNames,
  ticketPriorityLabel,
  ticketSlaState,
  ticketStatusLabel,
  ticketStatusStyle,
  type TicketQueue,
} from "@/lib/ticket-ui";

const TICKET_QUEUE_I18N: Record<TicketQueue, string> = {
  all: "ticket.queue.all",
  open: "ticket.queue.open",
  unassigned: "ticket.queue.unassigned",
  mine: "ticket.queue.mine",
};

interface TicketsPageClientProps {
  tickets: TicketRecord[];
  isAdmin: boolean;
  currentUserId: string;
  currentDepartmentId?: string | null;
  adminUsers: TicketAdminUser[];
  orgUsers: TicketAdminUser[];
  departments: TicketDepartment[];
}

export default function TicketsPageClient({
  tickets: initialTickets,
  isAdmin,
  currentUserId,
  currentDepartmentId = null,
  adminUsers,
  orgUsers,
  departments,
}: TicketsPageClientProps) {
  const { t, locale } = useI18n();
  const dateLocale = locale === "th" ? "th-TH" : undefined;
  const [tickets, setTickets] = useState<TicketRecord[]>(initialTickets);

  const statusLabel = (status: string) => {
    const key = `ticket.status.${normalizeTicketStatus(status)}`;
    const translated = t(key);
    return translated === key ? ticketStatusLabel(status) : translated;
  };

  const priorityLabel = (priority: string) => {
    const key = `ticket.priority.${priority}`;
    const translated = t(key);
    return translated === key ? ticketPriorityLabel(priority) : translated;
  };
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
        currentDepartmentId,
        queue,
        searchQuery,
        statusFilter,
        priorityFilter,
      }),
    [
      tickets,
      isAdmin,
      currentUserId,
      currentDepartmentId,
      queue,
      searchQuery,
      statusFilter,
      priorityFilter,
    ],
  );

  const selectedTicket =
    tickets.find((ticket) => ticket.id === selectedId) ?? null;

  const applyTicketChange = (updated: TicketRecord) => {
    setTickets((prev) =>
      prev.map((ticket) =>
        ticket.id === updated.id ? { ...ticket, ...updated } : ticket,
      ),
    );
  };

  const handleTicketCreated = (newTicket: TicketRecord) => {
    setTickets((prev) => [
      {
        ...newTicket,
        comments: newTicket.comments ?? [],
        actors: newTicket.actors ?? [],
        tasks: newTicket.tasks ?? [],
        validations: newTicket.validations ?? [],
        type: newTicket.type ?? "incident",
        category: newTicket.category ?? null,
        asset: newTicket.asset ?? null,
        solution: newTicket.solution ?? null,
      },
      ...prev,
    ]);
    setShowNewTicketForm(false);
    setSelectedId(newTicket.id);
  };

  const handleUpdate = async (
    ticketId: string,
    updates: Partial<TicketRecord> & {
      solution?: string;
      solutionAction?: string;
    },
  ) => {
    const response = await fetch(`/api/tickets/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      toast.error(t("ticket.updateFailed"));
      throw new Error("Failed to update ticket");
    }

    const updatedTicket = (await response.json()) as TicketRecord;
    applyTicketChange(updatedTicket);
    if (!updates.solution && !updates.solutionAction) {
      toast.success(t("ticket.updated"));
    }
    if (updates.solutionAction === "accept") {
      toast.success(t("ticket.solutionAccepted"));
    }
    if (updates.solutionAction === "refuse") {
      toast.success(t("ticket.solutionRefused"));
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
          <h1 className="text-2xl font-semibold tracking-tight">{t("ticket.title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("ticket.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/tickets">
                <Kanban className="h-4 w-4" />
                <span className="ml-2">{t("nav.board")}</span>
              </Link>
            </Button>
          )}
          <Button size="sm" onClick={() => setShowNewTicketForm(true)}>
            <Plus className="h-4 w-4" />
            <span className="ml-2">{t("ticket.new")}</span>
          </Button>
        </div>
      </div>

      {isAdmin && (
        <div className="space-y-1">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(TICKET_QUEUE_I18N) as TicketQueue[]).map((value) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={queue === value ? "default" : "outline"}
                onClick={() => setQueue(value)}
              >
                {t(TICKET_QUEUE_I18N[value])}
              </Button>
            ))}
          </div>
          {queue === "mine" && (
            <p className="text-muted-foreground text-xs">
              {t("ticket.queue.mineHint")}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder={t("ticket.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger
              className="w-[150px]"
              aria-label={t("ticket.col.status")}
            >
              <SelectValue placeholder={t("ticket.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("ticket.filter.allStatus")}</SelectItem>
              {TICKET_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {statusLabel(status.value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger
              className="w-[150px]"
              aria-label={t("ticket.col.priority")}
            >
              <SelectValue placeholder={t("ticket.priority")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("ticket.filter.allPriority")}</SelectItem>
              {TICKET_PRIORITIES.map((priority) => (
                <SelectItem key={priority.value} value={priority.value}>
                  {priorityLabel(priority.value)}
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
            title={t("ticket.emptyTitle")}
            description={
              tickets.length === 0
                ? t("ticket.emptyDescription")
                : t("ticket.emptyFiltered")
            }
            action={
              tickets.length === 0 ? (
                <Button size="sm" onClick={() => setShowNewTicketForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("ticket.new")}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">{t("ticket.col.id")}</TableHead>
                <TableHead>{t("ticket.col.title")}</TableHead>
                <TableHead>{t("ticket.col.item")}</TableHead>
                <TableHead>{t("ticket.col.requester")}</TableHead>
                <TableHead>{t("ticket.col.assigned")}</TableHead>
                <TableHead>{t("ticket.col.status")}</TableHead>
                <TableHead>{t("ticket.col.priority")}</TableHead>
                <TableHead>{t("ticket.col.ttr")}</TableHead>
                <TableHead>{t("ticket.col.updated")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTickets.map((ticket) => {
                const sla = ticketSlaState(ticket);
                return (
                  <TableRow
                    key={ticket.id}
                    tabIndex={0}
                    aria-label={t("ticket.openTicket", {
                      id: displayTicketNumber(ticket),
                    })}
                    className="cursor-pointer"
                    onClick={() => setSelectedId(ticket.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedId(ticket.id);
                      }
                    }}
                  >
                    <TableCell className="font-mono text-xs">
                      {displayTicketNumber(ticket)}
                    </TableCell>
                    <TableCell className="max-w-[18rem] truncate font-medium">
                      {ticket.title}
                    </TableCell>
                    <TableCell className="max-w-[14rem] truncate">
                      {displayTicketAsset(ticket.asset)}
                    </TableCell>
                    <TableCell className="max-w-[10rem] truncate">
                      {ticketActorNames(ticket, "requester")}
                    </TableCell>
                    <TableCell className="max-w-[10rem] truncate">
                      {ticketActorNames(ticket, "assignee")}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`${TICKET_CHIP_CLASS} ${ticketStatusStyle(ticket.status)}`}
                      >
                        {statusLabel(ticket.status)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`${TICKET_CHIP_CLASS} ${TICKET_PRIORITY_STYLES[ticket.priority] || TICKET_PRIORITY_STYLES.medium}`}
                      >
                        {priorityLabel(ticket.priority)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {sla === "overdue" ? (
                        <span className={`${TICKET_CHIP_CLASS} ${TICKET_OVERDUE_CHIP}`}>
                          {t("ticket.overdue")}
                        </span>
                      ) : ticket.timeToResolve ? (
                        new Date(ticket.timeToResolve).toLocaleDateString(dateLocale)
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                      {new Date(ticket.updatedAt).toLocaleString(dateLocale)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={showNewTicketForm} onOpenChange={setShowNewTicketForm}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogTitle>{t("ticket.new")}</DialogTitle>
          <NewTicketForm
            embedded
            departments={departments}
            onTicketCreated={handleTicketCreated}
            onCancel={() => setShowNewTicketForm(false)}
          />
        </DialogContent>
      </Dialog>

      <TicketDialog
        ticket={selectedTicket}
        open={selectedTicket != null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        isAdmin={isAdmin}
        currentUserId={currentUserId}
        adminUsers={adminUsers}
        orgUsers={orgUsers}
        departments={departments}
        onUpdate={handleUpdate}
        onAddComment={handleAddComment}
        onTicketChange={applyTicketChange}
      />
    </div>
  );
}
