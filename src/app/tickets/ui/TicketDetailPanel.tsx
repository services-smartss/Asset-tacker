"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, User } from "lucide-react";
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
import type { Ticket, TicketAdminUser, TicketAsset } from "@/types/ticket";
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_PRIORITY_STYLES,
  TICKET_STATUS_STYLES,
  TICKET_STATUSES,
  TICKET_TYPES,
  TICKET_TYPE_STYLES,
  displayTicketNumber,
  displayUserName,
  ticketStatusLabel,
  ticketTypeLabel,
} from "@/lib/ticket-ui";
import { AssetPicker } from "./AssetPicker";

interface TicketDetailPanelProps {
  ticket: Ticket;
  isAdmin: boolean;
  adminUsers: TicketAdminUser[];
  onBack?: () => void;
  onUpdate: (ticketId: string, updates: Partial<Ticket> & { solution?: string }) => Promise<void>;
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
  const [composer, setComposer] = useState<"answer" | "solution">("answer");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const statusStyle =
    TICKET_STATUS_STYLES[ticket.status] || TICKET_STATUS_STYLES.new;
  const typeStyle =
    TICKET_TYPE_STYLES[ticket.type] || TICKET_TYPE_STYLES.incident;
  const priorityStyle =
    TICKET_PRIORITY_STYLES[ticket.priority] || TICKET_PRIORITY_STYLES.medium;

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setIsSubmitting(true);
    try {
      if (composer === "solution") {
        await onUpdate(ticket.id, { solution: message.trim() });
        toast.success("Solution added");
      } else {
        await onAddComment(ticket.id, message.trim());
        toast.success("Follow-up added");
      }
      setMessage("");
    } catch {
      toast.error(
        composer === "solution"
          ? "Failed to add solution"
          : "Failed to add follow-up",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssetChange = async (asset: TicketAsset | null) => {
    try {
      await onUpdate(ticket.id, { assetId: asset?.assetid ?? null } as Partial<Ticket>);
    } catch {
      toast.error("Failed to update item");
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
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
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-mono text-sm font-semibold">
                  #{displayTicketNumber(ticket)}
                </p>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${typeStyle}`}
                >
                  {ticketTypeLabel(ticket.type || "incident")}
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusStyle}`}
                >
                  {ticketStatusLabel(ticket.status)}
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${priorityStyle}`}
                >
                  {ticket.priority}
                </span>
              </div>
              <h2 className="mt-1 text-lg leading-tight font-semibold">
                {ticket.title}
              </h2>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          <TimelineCard
            title="Opening"
            author={displayUserName(ticket.creator)}
            date={ticket.createdAt}
            body={ticket.description || "No description provided"}
          />

          {ticket.comments.map((comment) => (
            <TimelineCard
              key={comment.id}
              title="Follow-up"
              author={displayUserName(comment.user)}
              date={comment.createdAt}
              body={comment.comment}
            />
          ))}

          {ticket.solution && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm">
              <div className="mb-1 flex items-center gap-2 font-semibold text-green-800">
                <CheckCircle2 className="h-4 w-4" />
                Solution
              </div>
              <div className="text-muted-foreground mb-2 flex items-center justify-between text-xs">
                <span>{displayUserName(ticket.solver)}</span>
                <span>
                  {ticket.solvedAt
                    ? new Date(ticket.solvedAt).toLocaleString()
                    : ""}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-green-950">
                {ticket.solution}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2 border-t px-4 py-3">
          {isAdmin && (
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={composer === "answer" ? "default" : "outline"}
                onClick={() => setComposer("answer")}
              >
                Answer
              </Button>
              <Button
                type="button"
                size="sm"
                variant={composer === "solution" ? "default" : "outline"}
                onClick={() => setComposer("solution")}
              >
                Solution
              </Button>
            </div>
          )}
          <Textarea
            placeholder={
              composer === "solution"
                ? "Describe the solution..."
                : "Add a follow-up..."
            }
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
          />
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!message.trim() || isSubmitting}
          >
            {isSubmitting
              ? "Saving..."
              : composer === "solution"
                ? "Add solution"
                : "Add follow-up"}
          </Button>
        </div>
      </div>

      <aside className="w-full shrink-0 space-y-4 border-t px-4 py-4 lg:w-72 lg:border-t-0 lg:border-l">
        <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Actors & fields
        </p>

        <Field label="Requester">
          <p className="mt-1 flex items-center gap-1 text-sm">
            <User className="h-3.5 w-3.5" />
            {displayUserName(ticket.creator)}
          </p>
        </Field>

        <div>
          <Label htmlFor="ticket-assignee">Assigned to</Label>
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

        <div>
          <Label htmlFor="ticket-type">Type</Label>
          {isAdmin ? (
            <Select
              value={ticket.type || "incident"}
              onValueChange={(type) => onUpdate(ticket.id, { type })}
            >
              <SelectTrigger id="ticket-type" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TICKET_TYPES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="mt-1 text-sm">
              {ticketTypeLabel(ticket.type || "incident")}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="ticket-category">Category</Label>
          {isAdmin ? (
            <Select
              value={ticket.category || "none"}
              onValueChange={(value) =>
                onUpdate(ticket.id, {
                  category: value === "none" ? null : value,
                })
              }
            >
              <SelectTrigger id="ticket-category" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {TICKET_CATEGORIES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="mt-1 text-sm">{ticket.category || "None"}</p>
          )}
        </div>

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
          <Label>Item</Label>
          {isAdmin ? (
            <div className="mt-1">
              <AssetPicker
                value={ticket.asset}
                onChange={handleAssetChange}
              />
            </div>
          ) : ticket.asset ? (
            <Link
              href={`/assets/${ticket.asset.assetid}`}
              className="text-primary mt-1 block text-sm hover:underline"
            >
              {ticket.asset.assettag} — {ticket.asset.assetname}
            </Link>
          ) : (
            <p className="text-muted-foreground mt-1 text-sm">None</p>
          )}
        </div>

        {ticket.asset && isAdmin && (
          <Link
            href={`/assets/${ticket.asset.assetid}`}
            className="text-primary text-xs hover:underline"
          >
            Open asset
          </Link>
        )}
      </aside>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      {children}
    </div>
  );
}

function TimelineCard({
  title,
  author,
  date,
  body,
}: {
  title: string;
  author: string;
  date: Date | string;
  body: string;
}) {
  return (
    <div className="bg-muted/40 rounded-lg border p-3 text-sm">
      <div className="mb-1 flex items-start justify-between gap-3">
        <span className="font-medium">
          {title} · {author}
        </span>
        <span className="text-muted-foreground flex shrink-0 items-center gap-1 text-xs">
          <Clock className="h-3 w-3" />
          {new Date(date).toLocaleString()}
        </span>
      </div>
      <p className="text-muted-foreground whitespace-pre-wrap">{body}</p>
    </div>
  );
}
