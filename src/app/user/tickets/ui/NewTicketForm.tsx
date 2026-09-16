"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useI18n } from "@/hooks/useI18n";
import { useTicketCategories } from "@/hooks/useTicketCategories";
import { AssetPicker } from "@/app/tickets/ui/AssetPicker";
import {
  TICKET_SCALE,
  TICKET_TYPES,
  computePriority,
  ticketPriorityLabel,
} from "@/lib/ticket-ui";
import type { Ticket, TicketAsset, TicketDepartment } from "@/types/ticket";

interface NewTicketFormProps {
  onTicketCreated: (ticket: Ticket) => void;
  onCancel: () => void;
  embedded?: boolean;
  departments?: TicketDepartment[];
}

export function NewTicketForm({
  onTicketCreated,
  onCancel,
  embedded = false,
  departments = [],
}: NewTicketFormProps) {
  const { t } = useI18n();
  const { categories } = useTicketCategories();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState(3);
  const [impact, setImpact] = useState(3);
  const [type, setType] = useState("incident");
  const [category, setCategory] = useState("");
  const [siteDepartmentId, setSiteDepartmentId] = useState("");
  const [asset, setAsset] = useState<TicketAsset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const priorityLabel = (priority: string) => {
    const key = `ticket.priority.${priority}`;
    const translated = t(key);
    return translated === key ? ticketPriorityLabel(priority) : translated;
  };

  const scaleLabel = (value: number) => {
    const key = `ticket.scale.${value}`;
    const translated = t(key);
    return translated === key ? String(value) : translated;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error(t("ticket.titleRequired"));
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description: description.trim() || null,
          urgency,
          impact,
          type,
          category: category || null,
          assetId: asset?.assetid ?? null,
          siteDepartmentId: siteDepartmentId || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create ticket");
      }

      const newTicket = await response.json();
      toast.success(t("ticket.created"));
      onTicketCreated(newTicket);
    } catch (error) {
      console.error("Error creating ticket", error);
      toast.error(t("ticket.createFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={embedded ? undefined : "bg-card rounded-lg border p-6"}>
      {!embedded && (
        <h2 className="mb-4 text-xl font-semibold">{t("ticket.createTitle")}</h2>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="type">{t("ticket.type")}</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TICKET_TYPES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {t(`ticket.type.${item.value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="category">{t("ticket.category")}</Label>
            <Select
              value={category || "none"}
              onValueChange={(value) =>
                setCategory(value === "none" ? "" : value)
              }
            >
              <SelectTrigger id="category">
                <SelectValue placeholder={t("ticket.category")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("ticket.category.none")}</SelectItem>
                {categories.map((item) => (
                  <SelectItem key={item.id} value={item.name}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {departments.length > 0 && (
          <div>
            <Label htmlFor="site">{t("ticket.site")}</Label>
            <Select
              value={siteDepartmentId || "none"}
              onValueChange={(value) =>
                setSiteDepartmentId(value === "none" ? "" : value)
              }
            >
              <SelectTrigger id="site" className="mt-1">
                <SelectValue placeholder={t("ticket.site")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("ticket.siteNone")}</SelectItem>
                {departments.map((department) => (
                  <SelectItem key={department.id} value={department.id}>
                    {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground mt-1 text-xs">
              {t("ticket.siteHint")}
            </p>
          </div>
        )}

        <div>
          <Label>{t("ticket.item")}</Label>
          <AssetPicker value={asset} onChange={setAsset} />
        </div>

        <div>
          <Label htmlFor="title">{t("ticket.titleLabel")}</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("ticket.titlePlaceholder")}
            required
          />
        </div>

        <div>
          <Label htmlFor="description">{t("ticket.descriptionLabel")}</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("ticket.descriptionPlaceholder")}
            rows={4}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="urgency">{t("ticket.urgency")}</Label>
            <Select
              value={String(urgency)}
              onValueChange={(value) => setUrgency(Number(value))}
            >
              <SelectTrigger id="urgency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TICKET_SCALE.map((item) => (
                  <SelectItem key={item.value} value={String(item.value)}>
                    {scaleLabel(item.value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="impact">{t("ticket.impact")}</Label>
            <Select
              value={String(impact)}
              onValueChange={(value) => setImpact(Number(value))}
            >
              <SelectTrigger id="impact">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TICKET_SCALE.map((item) => (
                  <SelectItem key={item.value} value={String(item.value)}>
                    {scaleLabel(item.value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-muted-foreground text-xs">
          {t("ticket.priorityFromScale", {
            priority: priorityLabel(computePriority(urgency, impact)),
          })}
        </p>

        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("ticket.creating") : t("ticket.create")}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("action.cancel")}
          </Button>
        </div>
      </form>
    </div>
  );
}
