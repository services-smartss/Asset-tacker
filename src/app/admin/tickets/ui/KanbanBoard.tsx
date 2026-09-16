"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { TicketColumn } from "./TicketColumn";
import { TicketCard } from "./TicketCard";
import { TicketDialog } from "@/app/tickets/ui/TicketDialog";
import { toast } from "sonner";
import { useI18n } from "@/hooks/useI18n";
import type { Ticket, TicketAdminUser, TicketDepartment } from "@/types/ticket";
import {
  TICKET_STATUSES,
  normalizeTicketStatus,
  ticketStatusDotStyle,
  ticketStatusLabel,
} from "@/lib/ticket-ui";

interface KanbanBoardProps {
  tickets: Ticket[];
  adminUsers: TicketAdminUser[];
  orgUsers: TicketAdminUser[];
  departments: TicketDepartment[];
  currentUserId: string;
}

export default function KanbanBoard({
  tickets: initialTickets,
  adminUsers,
  orgUsers,
  departments,
  currentUserId,
}: KanbanBoardProps) {
  const { t } = useI18n();
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);

  const statusLabel = (status: string) => {
    const key = `ticket.status.${normalizeTicketStatus(status)}`;
    const translated = t(key);
    return translated === key ? ticketStatusLabel(status) : translated;
  };
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedTicket =
    tickets.find((ticket) => ticket.id === selectedId) ?? null;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const applyTicketChange = (updated: Ticket) => {
    setTickets((prev) =>
      prev.map((ticket) =>
        ticket.id === updated.id ? { ...ticket, ...updated } : ticket,
      ),
    );
  };

  const handleDragStart = (event: DragStartEvent) => {
    const ticket = tickets.find((t) => t.id === event.active.id);
    setActiveTicket(ticket || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTicket(null);

    if (!over || active.id === over.id) return;

    const ticketId = active.id as string;
    const newStatus = over.id as string;

    setTickets((prevTickets) =>
      prevTickets.map((ticket) =>
        ticket.id === ticketId ? { ...ticket, status: newStatus } : ticket,
      ),
    );

    try {
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update ticket");
      }

      const updatedTicket = await response.json();
      applyTicketChange(updatedTicket);
      toast.success(t("ticket.statusUpdated"));
    } catch (error) {
      console.error("Error updating ticket:", error);
      setTickets(initialTickets);
      toast.error(t("ticket.statusUpdateFailed"));
    }
  };

  const handleUpdateTicket = async (
    ticketId: string,
    updates: Partial<Ticket> & { solution?: string; solutionAction?: string },
  ) => {
    try {
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error("Failed to update ticket");
      }

      const updatedTicket = await response.json();
      applyTicketChange(updatedTicket);

      if (!updates.solution && !updates.solutionAction) {
        toast.success(t("ticket.updated"));
      }
    } catch (error) {
      console.error("Error updating ticket:", error);
      toast.error(t("ticket.updateFailed"));
      throw error;
    }
  };

  const handleAddComment = async (ticketId: string, comment: string) => {
    const response = await fetch(`/api/tickets/${ticketId}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ comment }),
    });

    if (!response.ok) {
      throw new Error("Failed to add comment");
    }

    const newComment = await response.json();

    setTickets((prevTickets) =>
      prevTickets.map((ticket) =>
        ticket.id === ticketId
          ? { ...ticket, comments: [...ticket.comments, newComment] }
          : ticket,
      ),
    );
  };

  const getTicketsByStatus = (status: string) => {
    return tickets.filter(
      (ticket) => normalizeTicketStatus(ticket.status) === status,
    );
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {TICKET_STATUSES.map((status) => (
            <TicketColumn
              key={status.value}
              id={status.value}
              label={statusLabel(status.value)}
              color={ticketStatusDotStyle(status.value)}
              tickets={getTicketsByStatus(status.value)}
              onTicketClick={(ticket) => setSelectedId(ticket.id)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTicket ? (
            <div className="opacity-80">
              <TicketCard ticket={activeTicket} onClick={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <TicketDialog
        ticket={selectedTicket}
        open={selectedTicket != null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        isAdmin
        currentUserId={currentUserId}
        adminUsers={adminUsers}
        orgUsers={orgUsers}
        departments={departments}
        onUpdate={handleUpdateTicket}
        onAddComment={handleAddComment}
        onTicketChange={applyTicketChange}
      />
    </>
  );
}
