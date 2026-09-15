"use client";

import { useDraggable } from "@dnd-kit/core";
import { Clock, User } from "lucide-react";
import { Ticket } from "@/types/ticket";
import {
  TICKET_CHIP_CLASS,
  TICKET_PRIORITY_STYLES,
  displayTicketAsset,
} from "@/lib/ticket-ui";

interface TicketCardProps {
  ticket: Ticket;
  onClick: () => void;
}

export function TicketCard({ ticket, onClick }: TicketCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: ticket.id,
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const priorityColor =
    TICKET_PRIORITY_STYLES[ticket.priority] || TICKET_PRIORITY_STYLES.medium;

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`bg-card cursor-pointer rounded-lg border p-4 text-left shadow-sm transition-all hover:shadow-md ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="mb-2 flex items-start justify-between">
        <div className="min-w-0">
          {ticket.ticketNumber != null && (
            <p className="text-muted-foreground font-mono text-[11px]">
              #{ticket.ticketNumber}
            </p>
          )}
          <h4 className="line-clamp-2 text-sm font-medium">{ticket.title}</h4>
        </div>
        <span className={`ml-2 ${TICKET_CHIP_CLASS} capitalize ${priorityColor}`}>
          {ticket.priority}
        </span>
      </div>

      <p className="mb-3 truncate text-xs">{displayTicketAsset(ticket.asset)}</p>

      {ticket.description && (
        <p className="text-muted-foreground mb-3 line-clamp-2 text-xs">
          {ticket.description}
        </p>
      )}

      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <div className="flex items-center gap-1">
          <User className="h-3 w-3" />
          <span>
            {ticket.creator.firstname} {ticket.creator.lastname}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      {ticket.assignee && (
        <div className="mt-2 flex items-center gap-1 text-xs">
          <span className="text-muted-foreground">Assigned to:</span>
          <span className="font-medium">
            {ticket.assignee.firstname} {ticket.assignee.lastname}
          </span>
        </div>
      )}
    </button>
  );
}
