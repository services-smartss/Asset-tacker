"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, X } from "lucide-react";
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
import type {
  Ticket,
  TicketActor,
  TicketAdminUser,
  TicketAsset,
  TicketDepartment,
} from "@/types/ticket";
import {
  TICKET_CATEGORIES,
  TICKET_CHIP_CLASS,
  TICKET_PRIORITY_STYLES,
  TICKET_SCALE,
  TICKET_STATUSES,
  TICKET_TYPES,
  TICKET_TYPE_STYLES,
  displayTicketNumber,
  displayUserName,
  ticketPriorityLabel,
  ticketSlaState,
  ticketStatusLabel,
  ticketStatusStyle,
  ticketTypeLabel,
} from "@/lib/ticket-ui";
import { cn } from "@/lib/utils";
import { AssetPicker } from "./AssetPicker";

interface TicketDetailPanelProps {
  ticket: Ticket;
  isAdmin: boolean;
  currentUserId: string;
  adminUsers: TicketAdminUser[];
  orgUsers?: TicketAdminUser[];
  departments?: TicketDepartment[];
  onBack?: () => void;
  className?: string;
  onUpdate: (
    ticketId: string,
    updates: Partial<Ticket> & { solution?: string; solutionAction?: string },
  ) => Promise<void>;
  onAddComment: (ticketId: string, comment: string) => Promise<void>;
  onTicketChange?: (ticket: Ticket) => void;
}

export function TicketDetailPanel({
  ticket,
  isAdmin,
  currentUserId,
  adminUsers,
  orgUsers = adminUsers,
  departments = [],
  onBack,
  className,
  onUpdate,
  onAddComment,
  onTicketChange,
}: TicketDetailPanelProps) {
  const [composer, setComposer] = useState<"follow-up" | "task" | "solution">(
    "follow-up",
  );
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const statusStyle = ticketStatusStyle(ticket.status);
  const typeStyle =
    TICKET_TYPE_STYLES[ticket.type] || TICKET_TYPE_STYLES.incident;
  const priorityStyle =
    TICKET_PRIORITY_STYLES[ticket.priority] || TICKET_PRIORITY_STYLES.medium;
  const sla = ticketSlaState(ticket);
  const isRequester =
    ticket.createdBy === currentUserId ||
    ticket.actors.some(
      (actor) => actor.role === "requester" && actor.userId === currentUserId,
    );
  const pendingValidation = ticket.validations.find(
    (item) => item.status === "waiting" && item.targetUserId === currentUserId,
  );

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setIsSubmitting(true);
    try {
      if (composer === "solution") {
        await onUpdate(ticket.id, { solution: message.trim() });
        toast.success("Solution submitted for approval");
      } else if (composer === "task") {
        const response = await fetch(`/api/tickets/${ticket.id}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: message.trim() }),
        });
        if (!response.ok) throw new Error("Failed to add task");
        const task = await response.json();
        onTicketChange?.({ ...ticket, tasks: [...ticket.tasks, task] });
        toast.success("Task added");
      } else {
        await onAddComment(ticket.id, message.trim());
        toast.success("Follow-up added");
      }
      setMessage("");
    } catch {
      toast.error("Failed to save");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssetChange = async (asset: TicketAsset | null) => {
    try {
      await onUpdate(ticket.id, {
        assetId: asset?.assetid ?? null,
      } as Partial<Ticket>);
    } catch {
      toast.error("Failed to update item");
    }
  };

  const saveActors = async (actors: TicketActor[]) => {
    const response = await fetch(`/api/tickets/${ticket.id}/actors`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actors: actors.map((actor) => ({
          role: actor.role,
          userId: actor.userId,
          departmentId: actor.departmentId,
        })),
      }),
    });
    if (!response.ok) {
      toast.error("Failed to update actors");
      throw new Error("Failed to update actors");
    }
    const updated = (await response.json()) as Ticket;
    onTicketChange?.(updated);
  };

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col lg:flex-row", className)}>
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
                <span className={`${TICKET_CHIP_CLASS} text-[11px] ${typeStyle}`}>
                  {ticketTypeLabel(ticket.type || "incident")}
                </span>
                <span className={`${TICKET_CHIP_CLASS} text-[11px] ${statusStyle}`}>
                  {ticketStatusLabel(ticket.status)}
                </span>
                <span
                  className={`${TICKET_CHIP_CLASS} text-[11px] ${priorityStyle}`}
                >
                  {ticketPriorityLabel(ticket.priority)}
                </span>
                {sla === "overdue" && (
                  <span className={`${TICKET_CHIP_CLASS} text-[11px] bg-destructive/10 text-destructive border-destructive/30`}>
                    Overdue
                  </span>
                )}
                {sla === "paused" && (
                  <span className={`${TICKET_CHIP_CLASS} text-[11px] bg-muted text-muted-foreground`}>
                    SLA paused
                  </span>
                )}
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

          {ticket.tasks.map((task) => (
            <div key={task.id} className="bg-muted/40 rounded-lg border p-3 text-sm">
              <div className="mb-1 flex items-start justify-between gap-3">
                <span className="font-medium">
                  Task · {displayUserName(task.creator)}
                </span>
                {isAdmin ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const next = task.state === "done" ? "todo" : "done";
                      const response = await fetch(
                        `/api/tickets/${ticket.id}/tasks/${task.id}`,
                        {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ state: next }),
                        },
                      );
                      if (!response.ok) {
                        toast.error("Failed to update task");
                        return;
                      }
                      const updated = await response.json();
                      onTicketChange?.({
                        ...ticket,
                        tasks: ticket.tasks.map((item) =>
                          item.id === task.id ? updated : item,
                        ),
                      });
                    }}
                  >
                    {task.state === "done" ? "Reopen" : "Done"}
                  </Button>
                ) : (
                  <span className="text-muted-foreground text-xs capitalize">
                    {task.state}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {task.content}
              </p>
            </div>
          ))}

          {ticket.validations.map((item) => (
            <TimelineCard
              key={item.id}
              title={`Validation ${item.status}`}
              author={displayUserName(item.requester)}
              date={item.createdAt}
              body={
                item.commentValidation ||
                item.commentSubmission ||
                `Requested from ${displayUserName(item.target)}`
              }
            />
          ))}

          {ticket.solution && (
            <div className="border-success-foreground/20 bg-success-bg rounded-lg border p-3 text-sm">
              <div className="text-success-foreground mb-1 flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-4 w-4" />
                Solution
                <span className="text-xs font-medium capitalize">
                  ({ticket.solutionStatus})
                </span>
              </div>
              <div className="text-muted-foreground mb-2 flex items-center justify-between text-xs">
                <span>{displayUserName(ticket.solver)}</span>
                <span>
                  {ticket.solvedAt
                    ? new Date(ticket.solvedAt).toLocaleString()
                    : ""}
                </span>
              </div>
              <p className="text-success-foreground whitespace-pre-wrap">
                {ticket.solution}
              </p>
              {ticket.solutionStatus === "waiting" &&
                (isAdmin || isRequester) && (
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        onUpdate(ticket.id, { solutionAction: "accept" })
                      }
                    >
                      Accept solution
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        onUpdate(ticket.id, { solutionAction: "refuse" })
                      }
                    >
                      Refuse
                    </Button>
                  </div>
                )}
            </div>
          )}
        </div>

        <div className="space-y-2 border-t px-4 py-3">
          {isAdmin && (
            <div className="flex gap-2">
              {(["follow-up", "task", "solution"] as const).map((mode) => (
                <Button
                  key={mode}
                  type="button"
                  size="sm"
                  variant={composer === mode ? "default" : "outline"}
                  onClick={() => setComposer(mode)}
                >
                  {mode === "follow-up"
                    ? "Follow-up"
                    : mode === "task"
                      ? "Task"
                      : "Solution"}
                </Button>
              ))}
            </div>
          )}
          <Textarea
            placeholder={
              composer === "solution"
                ? "Describe the solution..."
                : composer === "task"
                  ? "Describe the task..."
                  : "Add a follow-up..."
            }
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
          />
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!message.trim() || isSubmitting || (!isAdmin && composer !== "follow-up")}
          >
            {isSubmitting
              ? "Saving..."
              : composer === "solution"
                ? "Submit solution"
                : composer === "task"
                  ? "Add task"
                  : "Add follow-up"}
          </Button>
        </div>
      </div>

      <aside className="w-full shrink-0 space-y-4 border-t px-4 py-4 lg:w-72 lg:border-t-0 lg:border-l">
        <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Actors & fields
        </p>

        <ActorGroup
          label="Requester"
          role="requester"
          ticket={ticket}
          orgUsers={orgUsers}
          departments={departments}
          allowDepartment={false}
          isAdmin={isAdmin}
          onSave={saveActors}
        />
        <ActorGroup
          label="Observer"
          role="observer"
          ticket={ticket}
          orgUsers={orgUsers}
          departments={departments}
          allowDepartment={false}
          isAdmin={isAdmin}
          onSave={saveActors}
        />
        <ActorGroup
          label="Assigned"
          role="assignee"
          ticket={ticket}
          orgUsers={adminUsers}
          departments={departments}
          allowDepartment
          isAdmin={isAdmin}
          onSave={saveActors}
        />

        <div>
          <Label htmlFor="ticket-urgency">Urgency</Label>
          {isAdmin ? (
            <Select
              value={String(ticket.urgency ?? 3)}
              onValueChange={(value) =>
                onUpdate(ticket.id, { urgency: Number(value) })
              }
            >
              <SelectTrigger id="ticket-urgency" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TICKET_SCALE.map((item) => (
                  <SelectItem key={item.value} value={String(item.value)}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="mt-1 text-sm">
              {TICKET_SCALE.find((item) => item.value === ticket.urgency)?.label ??
                ticket.urgency}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="ticket-impact">Impact</Label>
          {isAdmin ? (
            <Select
              value={String(ticket.impact ?? 3)}
              onValueChange={(value) =>
                onUpdate(ticket.id, { impact: Number(value) })
              }
            >
              <SelectTrigger id="ticket-impact" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TICKET_SCALE.map((item) => (
                  <SelectItem key={item.value} value={String(item.value)}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="mt-1 text-sm">
              {TICKET_SCALE.find((item) => item.value === ticket.impact)?.label ??
                ticket.impact}
            </p>
          )}
        </div>

        <Field label="Priority">
          <p className="mt-1 text-sm">
            {ticketPriorityLabel(ticket.priority)}
          </p>
        </Field>

        <Field label="SLA">
          <p className="mt-1 text-xs">
            TTO{" "}
            {ticket.timeToOwn
              ? new Date(ticket.timeToOwn).toLocaleString()
              : "—"}
          </p>
          <p className="text-xs">
            TTR{" "}
            {ticket.timeToResolve
              ? new Date(ticket.timeToResolve).toLocaleString()
              : "—"}
            {sla === "paused" ? " · paused" : ""}
            {sla === "overdue" ? " · overdue" : ""}
          </p>
        </Field>

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
          <Label>Item</Label>
          {isAdmin ? (
            <div className="mt-1">
              <AssetPicker value={ticket.asset} onChange={handleAssetChange} />
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

        {isAdmin && (
          <div>
            <Label htmlFor="ticket-validation">Request validation</Label>
            <Select
              value=""
              onValueChange={async (targetUserId) => {
                const response = await fetch(
                  `/api/tickets/${ticket.id}/validations`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ targetUserId }),
                  },
                );
                if (!response.ok) {
                  toast.error("Failed to request validation");
                  return;
                }
                onTicketChange?.((await response.json()) as Ticket);
                toast.success("Validation requested");
              }}
            >
              <SelectTrigger id="ticket-validation" className="mt-1">
                <SelectValue placeholder="Choose approver" />
              </SelectTrigger>
              <SelectContent>
                {orgUsers.map((person) => (
                  <SelectItem key={person.userid} value={person.userid}>
                    {displayUserName(person)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {ticket.globalValidation !== "none" && (
              <p className="text-muted-foreground mt-1 text-xs capitalize">
                {ticket.globalValidation}
              </p>
            )}
          </div>
        )}

        {pendingValidation && (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={async () => {
                const response = await fetch(
                  `/api/tickets/${ticket.id}/validations/${pendingValidation.id}`,
                  {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "accept" }),
                  },
                );
                if (!response.ok) {
                  toast.error("Failed to accept validation");
                  return;
                }
                onTicketChange?.((await response.json()) as Ticket);
              }}
            >
              Accept validation
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                const response = await fetch(
                  `/api/tickets/${ticket.id}/validations/${pendingValidation.id}`,
                  {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "refuse" }),
                  },
                );
                if (!response.ok) {
                  toast.error("Failed to refuse validation");
                  return;
                }
                onTicketChange?.((await response.json()) as Ticket);
              }}
            >
              Refuse
            </Button>
          </div>
        )}
      </aside>
    </div>
  );
}

function ActorGroup({
  label,
  role,
  ticket,
  orgUsers,
  departments,
  allowDepartment,
  isAdmin,
  onSave,
}: {
  label: string;
  role: string;
  ticket: Ticket;
  orgUsers: TicketAdminUser[];
  departments: TicketDepartment[];
  allowDepartment: boolean;
  isAdmin: boolean;
  onSave: (actors: TicketActor[]) => Promise<void>;
}) {
  const actors = ticket.actors.filter((actor) => actor.role === role);

  const addUser = async (userId: string) => {
    if (actors.some((actor) => actor.userId === userId)) return;
    await onSave([
      ...ticket.actors,
      {
        id: `tmp-${userId}`,
        role,
        userId,
        departmentId: null,
        user: null,
        department: null,
      },
    ]);
  };

  const addDepartment = async (departmentId: string) => {
    if (actors.some((actor) => actor.departmentId === departmentId)) return;
    await onSave([
      ...ticket.actors,
      {
        id: `tmp-${departmentId}`,
        role,
        userId: null,
        departmentId,
        user: null,
        department: null,
      },
    ]);
  };

  const removeActor = async (actorId: string) => {
    await onSave(ticket.actors.filter((actor) => actor.id !== actorId));
  };

  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      <div className="mt-1 space-y-1">
        {actors.length === 0 && (
          <p className="text-muted-foreground text-xs">None</p>
        )}
        {actors.map((actor) => (
          <div
            key={actor.id}
            className="flex items-center justify-between gap-2 text-sm"
          >
            <span className="min-w-0 truncate">
              {actor.user
                ? displayUserName(actor.user)
                : actor.department?.name || "Group"}
            </span>
            {isAdmin && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => removeActor(actor.id)}
                aria-label={`Remove ${label}`}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>
      {isAdmin && (
        <div className="mt-2 space-y-2">
          <Select value="" onValueChange={addUser}>
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Add user" />
            </SelectTrigger>
            <SelectContent>
              {orgUsers.map((person) => (
                <SelectItem key={person.userid} value={person.userid}>
                  {displayUserName(person)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {allowDepartment && departments.length > 0 && (
            <Select value="" onValueChange={addDepartment}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Add department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((department) => (
                  <SelectItem key={department.id} value={department.id}>
                    {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
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
