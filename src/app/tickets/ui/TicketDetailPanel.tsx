"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { CheckCircle2, X } from "lucide-react";
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
  TicketComment,
  TicketDepartment,
  TicketTask,
  TicketValidation,
} from "@/types/ticket";
import {
  TICKET_CATEGORIES,
  TICKET_CHIP_CLASS,
  TICKET_OVERDUE_CHIP,
  TICKET_PRIORITY_STYLES,
  TICKET_SCALE,
  TICKET_SLA_PAUSED_CHIP,
  TICKET_STATUSES,
  TICKET_TYPES,
  TICKET_TYPE_STYLES,
  displayTicketNumber,
  displayUserInitials,
  displayUserName,
  isTimelineRequesterSide,
  ticketPriorityLabel,
  ticketSlaState,
  ticketStatusLabel,
  ticketStatusStyle,
  ticketTypeLabel,
} from "@/lib/ticket-ui";
import { cn } from "@/lib/utils";
import { AssetPicker } from "./AssetPicker";

const COMPOSER_FILL = {
  "follow-up": "bg-[#2563eb] text-white hover:bg-[#1d4ed8]",
  task: "bg-[#c2410c] text-white hover:bg-[#9a3412]",
  solution: "bg-[#15803d] text-white hover:bg-[#166534]",
} as const;

export interface TicketDetailPanelProps {
  ticket: Ticket;
  isAdmin: boolean;
  currentUserId: string;
  adminUsers: TicketAdminUser[];
  orgUsers?: TicketAdminUser[];
  departments?: TicketDepartment[];
  className?: string;
  onUpdate: (
    ticketId: string,
    updates: Partial<Ticket> & { solution?: string; solutionAction?: string },
  ) => Promise<void>;
  onAddComment: (ticketId: string, comment: string) => Promise<void>;
  onTicketChange?: (ticket: Ticket) => void;
}

type TimelineEntry =
  | { id: string; at: number; kind: "opening" }
  | { id: string; at: number; kind: "follow-up"; comment: TicketComment }
  | { id: string; at: number; kind: "task"; task: TicketTask }
  | { id: string; at: number; kind: "validation"; validation: TicketValidation }
  | { id: string; at: number; kind: "solution" };

function ticketTimeline(ticket: Ticket): TimelineEntry[] {
  const items: TimelineEntry[] = [
    {
      id: `opening-${ticket.id}`,
      at: new Date(ticket.createdAt).getTime(),
      kind: "opening",
    },
  ];
  for (const comment of ticket.comments) {
    items.push({
      id: comment.id,
      at: new Date(comment.createdAt).getTime(),
      kind: "follow-up",
      comment,
    });
  }
  for (const task of ticket.tasks) {
    items.push({
      id: task.id,
      at: new Date(task.createdAt).getTime(),
      kind: "task",
      task,
    });
  }
  for (const validation of ticket.validations) {
    items.push({
      id: validation.id,
      at: new Date(validation.createdAt).getTime(),
      kind: "validation",
      validation,
    });
  }
  if (ticket.solution) {
    items.push({
      id: `solution-${ticket.id}`,
      at: new Date(ticket.solvedAt ?? ticket.updatedAt).getTime(),
      kind: "solution",
    });
  }
  return items.sort((a, b) => {
    if (a.at !== b.at) return a.at - b.at;
    if (a.kind === "opening") return -1;
    if (b.kind === "opening") return 1;
    return 0;
  });
}

export function TicketDetailPanel({
  ticket,
  isAdmin,
  currentUserId,
  adminUsers,
  orgUsers = adminUsers,
  departments = [],
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
  const timelineRef = useRef<HTMLDivElement>(null);
  const adminIds = useMemo(
    () => new Set(adminUsers.map((person) => person.userid)),
    [adminUsers],
  );
  const timeline = useMemo(() => ticketTimeline(ticket), [ticket]);

  const typeStyle = TICKET_TYPE_STYLES[ticket.type] || TICKET_TYPE_STYLES.incident;
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

  useEffect(() => {
    const node = timelineRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [
    ticket.id,
    ticket.comments.length,
    ticket.tasks.length,
    ticket.validations.length,
    ticket.solution,
  ]);

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
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <header className="shrink-0 border-b px-4 py-3 pr-12">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-mono text-sm font-semibold">
            #{displayTicketNumber(ticket)}
          </p>
          <span className={`${TICKET_CHIP_CLASS} ${typeStyle}`}>
            {ticketTypeLabel(ticket.type || "incident")}
          </span>
          <span className={`${TICKET_CHIP_CLASS} ${ticketStatusStyle(ticket.status)}`}>
            {ticketStatusLabel(ticket.status)}
          </span>
          <span className={`${TICKET_CHIP_CLASS} ${priorityStyle}`}>
            {ticketPriorityLabel(ticket.priority)}
          </span>
          {sla === "overdue" && (
            <span className={`${TICKET_CHIP_CLASS} ${TICKET_OVERDUE_CHIP}`}>
              Overdue
            </span>
          )}
          {sla === "paused" && (
            <span className={`${TICKET_CHIP_CLASS} ${TICKET_SLA_PAUSED_CHIP}`}>
              SLA paused
            </span>
          )}
        </div>
        <h2 className="mt-1 text-lg leading-tight font-semibold">{ticket.title}</h2>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div
            ref={timelineRef}
            className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4"
          >
            {timeline.map((entry) => {
              if (entry.kind === "opening") {
                return (
                  <ChatBubble
                    key={entry.id}
                    side="requester"
                    label="Opening"
                    author={displayUserName(ticket.creator)}
                    date={ticket.createdAt}
                    body={ticket.description || "No description provided"}
                  />
                );
              }
              if (entry.kind === "follow-up") {
                const requesterSide = isTimelineRequesterSide(
                  ticket,
                  entry.comment.user.userid,
                  adminIds,
                );
                return (
                  <ChatBubble
                    key={entry.id}
                    side={requesterSide ? "requester" : "technician"}
                    author={displayUserName(entry.comment.user)}
                    date={entry.comment.createdAt}
                    body={entry.comment.comment}
                  />
                );
              }
              if (entry.kind === "task") {
                return (
                  <TaskCard
                    key={entry.id}
                    ticket={ticket}
                    task={entry.task}
                    isAdmin={isAdmin}
                    onTicketChange={onTicketChange}
                  />
                );
              }
              if (entry.kind === "validation") {
                return (
                  <EventCard
                    key={entry.id}
                    title={`Validation · ${entry.validation.status}`}
                    author={displayUserName(entry.validation.requester)}
                    date={entry.validation.createdAt}
                    body={
                      entry.validation.commentValidation ||
                      entry.validation.commentSubmission ||
                      `Requested from ${displayUserName(entry.validation.target)}`
                    }
                  />
                );
              }
              return (
                <SolutionCard
                  key={entry.id}
                  ticket={ticket}
                  isAdmin={isAdmin}
                  isRequester={isRequester}
                  onUpdate={onUpdate}
                />
              );
            })}
          </div>

          <div className="shrink-0 space-y-2 border-t px-4 py-3">
            {isAdmin && (
              <div className="flex flex-wrap gap-2">
                {(["follow-up", "task", "solution"] as const).map((mode) => (
                  <Button
                    key={mode}
                    type="button"
                    size="sm"
                    variant={composer === mode ? "default" : "outline"}
                    className={composer === mode ? COMPOSER_FILL[mode] : undefined}
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
                    : "Write a message..."
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.stopPropagation();
                }
              }}
              rows={3}
            />
            <Button
              type="button"
              className={COMPOSER_FILL[isAdmin ? composer : "follow-up"]}
              onClick={handleSubmit}
              disabled={
                !message.trim() ||
                isSubmitting ||
                (!isAdmin && composer !== "follow-up")
              }
            >
              {isSubmitting
                ? "Saving..."
                : composer === "solution"
                  ? "Submit solution"
                  : composer === "task"
                    ? "Add task"
                    : "Send"}
            </Button>
          </div>
        </div>

        <aside className="w-full shrink-0 space-y-4 overflow-y-auto border-t px-4 py-4 lg:w-[30%] lg:border-t-0 lg:border-l">
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Actors
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
                {TICKET_SCALE.find((item) => item.value === ticket.urgency)
                  ?.label ?? ticket.urgency}
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
                {TICKET_SCALE.find((item) => item.value === ticket.impact)
                  ?.label ?? ticket.impact}
              </p>
            )}
          </div>

          <Field label="Priority">
            <p className="mt-1 text-sm">{ticketPriorityLabel(ticket.priority)}</p>
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
    </div>
  );
}

function ChatBubble({
  side,
  label,
  author,
  date,
  body,
}: {
  side: "requester" | "technician";
  label?: string;
  author: string;
  date: Date | string;
  body: string;
}) {
  const requester = side === "requester";
  return (
    <div
      className={cn("flex items-end gap-2", requester ? "justify-start" : "justify-end")}
    >
      {requester && <Initials name={author} />}
      <div
        className={cn(
          "max-w-[min(36rem,80%)] rounded-2xl px-3 py-2 text-sm",
          requester
            ? "rounded-bl-md bg-[#F4F5F6] text-[#1C1F24]"
            : "rounded-br-md bg-[#DBEAFE] text-[#1C1F24]",
        )}
      >
        {label && (
          <p className="text-[10px] font-semibold tracking-wide uppercase text-[#57534e]">
            {label}
          </p>
        )}
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-medium">{author}</span>
          <time className="shrink-0 text-[11px] text-[#57534e]">
            {new Date(date).toLocaleString()}
          </time>
        </div>
        <p className="mt-1 whitespace-pre-wrap">{body}</p>
      </div>
      {!requester && <Initials name={author} />}
    </div>
  );
}

function Initials({ name }: { name: string }) {
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1C1F24] text-[11px] font-semibold text-[#FAFAFA]"
      aria-hidden
    >
      {displayUserInitials(name)}
    </div>
  );
}

function TaskCard({
  ticket,
  task,
  isAdmin,
  onTicketChange,
}: {
  ticket: Ticket;
  task: TicketTask;
  isAdmin: boolean;
  onTicketChange?: (ticket: Ticket) => void;
}) {
  return (
    <div className="rounded-lg border border-[#f5d98a] bg-[#FEF3C7] p-3 text-sm text-[#1C1F24]">
      <div className="mb-1 flex items-start justify-between gap-3">
        <span className="font-medium">Task · {displayUserName(task.creator)}</span>
        {isAdmin ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-[#e8c56b] bg-[#fff8e1] text-[#1C1F24] hover:bg-[#FEF3C7]"
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
          <span className="text-xs capitalize text-[#57534e]">{task.state}</span>
        )}
      </div>
      <p className="whitespace-pre-wrap">{task.content}</p>
    </div>
  );
}

function SolutionCard({
  ticket,
  isAdmin,
  isRequester,
  onUpdate,
}: {
  ticket: Ticket;
  isAdmin: boolean;
  isRequester: boolean;
  onUpdate: TicketDetailPanelProps["onUpdate"];
}) {
  const accepted = ticket.solutionStatus === "accepted";
  return (
    <div
      className={cn(
        "rounded-lg border p-3 text-sm",
        accepted
          ? "border-[#86efac] bg-[#dcfce7] text-[#14532d]"
          : "border-[#bbf7d0] bg-[#f0fdf4] text-[#1C1F24]",
      )}
    >
      <div className="mb-1 flex items-center gap-2 font-semibold">
        <CheckCircle2 className="h-4 w-4" />
        Solution
        <span className="text-xs font-medium capitalize">
          ({ticket.solutionStatus})
        </span>
      </div>
      <div className="mb-2 flex items-center justify-between text-xs">
        <span>{displayUserName(ticket.solver)}</span>
        <span>
          {ticket.solvedAt ? new Date(ticket.solvedAt).toLocaleString() : ""}
        </span>
      </div>
      <p className="whitespace-pre-wrap">{ticket.solution}</p>
      {ticket.solutionStatus === "waiting" && (isAdmin || isRequester) && (
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            onClick={() => onUpdate(ticket.id, { solutionAction: "accept" })}
          >
            Accept solution
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onUpdate(ticket.id, { solutionAction: "refuse" })}
          >
            Refuse
          </Button>
        </div>
      )}
    </div>
  );
}

function EventCard({
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
    <div className="rounded-lg border bg-[#F4F5F6] p-3 text-sm text-[#1C1F24]">
      <div className="mb-1 flex items-start justify-between gap-3">
        <span className="font-medium">
          {title} · {author}
        </span>
        <span className="shrink-0 text-xs text-[#57534e]">
          {new Date(date).toLocaleString()}
        </span>
      </div>
      <p className="whitespace-pre-wrap">{body}</p>
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
