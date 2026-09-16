"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { TicketDetailPanel, type TicketDetailPanelProps } from "./TicketDetailPanel";
import type { Ticket } from "@/types/ticket";

interface TicketDialogProps extends Omit<TicketDetailPanelProps, "ticket" | "className"> {
  ticket: Ticket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TicketDialog({
  ticket,
  open,
  onOpenChange,
  ...panelProps
}: TicketDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-h-[90vh] w-[95vw] max-w-[95vw] flex-col gap-0 overflow-hidden p-0 sm:rounded-lg">
        <DialogTitle className="sr-only">
          {ticket ? `#${ticket.ticketNumber} ${ticket.title}` : "Ticket"}
        </DialogTitle>
        {ticket ? (
          <TicketDetailPanel
            ticket={ticket}
            className="h-full min-h-0"
            {...panelProps}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
