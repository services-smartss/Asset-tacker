"use client";

import { useState } from "react";
import { ArrowLeft, Clock, MessageSquare, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { Ticket, TicketAdminUser } from "@/types/ticket";
import {
  TICKET_PRIORITIES,
  TICKET_PRIORITY_STYLES,
  TICKET_STATUS_STYLES,
  TICKET_STATUSES,
  displayUserName,
  shortTicketId,
  ticketStatusLabel,
} from "@/lib/ticket-ui";

interface TicketDetailPanelProps {
  ticket: Ticket;
  isAdmin: boolean;
  adminUsers: TicketAdminUser[];
  onBack?: () => void;
  onUpdate: (ticketId: string, updates: Partial<Ticket>) => Promise<void>;
  onAddComment: (ticketId: string, comment: string) => Promise<void>;
}

export function TicketDetailPanel({
  ticket,
  isAdmin,
  adminUsers,
  onBack,
  onUpdate,
  onAddComment,
}: TicketDetailPanelProps) {
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const statusStyle =
    TICKET_STATUS_STYLES[ticket.status] || TICKET_STATUS_STYLES.new;
  const priorityStyle =
    TICKET_PRIORITY_STYLES[ticket.priority] || TICKET_PRIORITY_STYLES.medium;

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddComment(ticket.id, newComment);
      setNewComment("");
      toast.success("Comment added");
    } catch {
      toast.error("Failed to add comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="border-b px-4 py-3">
          <div className="flex items-start gap-3">
            {onBack && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mt-0.5 shrink-0 md:hidden"
                onClick={onBack}
                aria-label="Back to ticket list"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-muted-foreground font-mono text-xs">
                #{shortTicketId(ticket.id)}
              </p>
              <h2 className="text-lg leading-tight font-semibold">
                {ticket.title}
              </h2>
              <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                <span className="inline-flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {displayUserName(ticket.creator)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {new Date(ticket.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-2">
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${priorityStyle}`}
              >
                {ticket.priority}
              </span>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusStyle}`}
              >
                {ticketStatusLabel(ticket.status)}
              </span>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <div>
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Description
            </p>
            <p className="mt-1 text-sm whitespace-pre-wrap">
              {ticket.description || "No description provided"}
            </p>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <p className="text-sm font-semibold">
                Conversation ({ticket.comments.length})
              </p>
            </div>
            {ticket.comments.length === 0 ? (
              <p className="text-muted-foreground text-sm italic">
                No comments yet
              </p>
            ) : (
              <div className="space-y-3">
                {ticket.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="bg-muted/50 rounded-lg border p-3 text-sm"
                  >
                    <div className="mb-1 flex items-start justify-between gap-3">
                      <span className="font-medium">
                        {displayUserName(comment.user)}
                      </span>
                      <span className="text-muted-foreground shrink-0 text-xs">
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {comment.comment}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2 border-t px-4 py-3">
          <Textarea
            placeholder="Reply to this ticket..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
          />
          <Button
            type="button"
            onClick={handleAddComment}
            disabled={!newComment.trim() || isSubmitting}
          >
            {isSubmitting ? "Sending..." : "Send reply"}
          </Button>
        </div>
      </div>

      <aside className="w-full shrink-0 space-y-4 border-t px-4 py-4 md:w-64 md:border-t-0 md:border-l">
        <div>
          <Label htmlFor="ticket-status">Status</Label>
          {isAdmin ? (
            <Select
              value={ticket.status}
              onValueChange={(status) => onUpdate(ticket.id, { status })}
            >
              <SelectTrigger id="ticket-status" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TICKET_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="mt-1 text-sm">{ticketStatusLabel(ticket.status)}</p>
          )}
        </div>

        <div>
          <Label htmlFor="ticket-priority">Priority</Label>
          {isAdmin ? (
            <Select
              value={ticket.priority}
              onValueChange={(priority) => onUpdate(ticket.id, { priority })}
            >
              <SelectTrigger id="ticket-priority" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TICKET_PRIORITIES.map((priority) => (
                  <SelectItem key={priority.value} value={priority.value}>
                    {priority.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="mt-1 text-sm capitalize">{ticket.priority}</p>
          )}
        </div>

        <div>
          <Label htmlFor="ticket-assignee">Assignee</Label>
          {isAdmin ? (
            <Select
              value={ticket.assignedTo || "unassigned"}
              onValueChange={(userId) =>
                onUpdate(ticket.id, {
                  assignedTo: userId === "unassigned" ? null : userId,
                })
              }
            >
              <SelectTrigger id="ticket-assignee" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {adminUsers.map((admin) => (
                  <SelectItem key={admin.userid} value={admin.userid}>
                    {displayUserName(admin)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="mt-1 text-sm">{displayUserName(ticket.assignee)}</p>
          )}
        </div>
      </aside>
    </div>
  );
}
