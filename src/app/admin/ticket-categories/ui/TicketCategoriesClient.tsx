"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { useI18n } from "@/hooks/useI18n";
import { PlusIcon, SearchIcon } from "@/ui/Icons";

export type TicketCategory = {
  id: string;
  name: string;
  sortOrder: number;
};

export default function TicketCategoriesClient({
  initialItems,
}: {
  initialItems: TicketCategory[];
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [searchValue, setSearchValue] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TicketCategory | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const filtered = useMemo(() => {
    const q = searchValue.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.name.toLowerCase().includes(q));
  }, [items, searchValue]);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDialogOpen(true);
  };

  const openEdit = (item: TicketCategory) => {
    setEditing(item);
    setName(item.name);
    setDialogOpen(true);
  };

  const save = async () => {
    if (!name.trim()) {
      toast.error(t("common.requiredField"));
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/ticket-categories", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editing ? { id: editing.id, name: name.trim() } : { name: name.trim() },
        ),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || t("common.errorOccurred"));
      }
      toast.success(t("common.savedSuccessfully"));
      setDialogOpen(false);
      router.refresh();
      const list = await fetch("/api/ticket-categories");
      if (list.ok) setItems(await list.json());
    } catch (error) {
      toast.error(t("common.errorOccurred"), {
        description: (error as Error).message,
      });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: TicketCategory) => {
    if (!confirm(t("common.areYouSure"))) return;
    try {
      const response = await fetch("/api/ticket-categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      if (!response.ok) throw new Error("Delete failed");
      toast.success(t("common.deletedSuccessfully"));
      setItems((prev) => prev.filter((row) => row.id !== item.id));
      router.refresh();
    } catch {
      toast.error(t("common.errorOccurred"));
    }
  };

  const columns = [
    { key: "name", label: t("table.name") },
    { key: "actions", label: "" },
  ];

  const renderCell = (item: TicketCategory, columnKey: string) => {
    if (columnKey === "name") return item.name;
    return (
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => remove(item)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("page.ticketCategories.title")}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("page.ticketCategories.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative w-full sm:w-64">
            <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              className="pl-9"
              placeholder={t("action.search")}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>
          <Button onClick={openCreate}>
            <PlusIcon className="mr-2 h-4 w-4" />
            {t("action.create")}
          </Button>
        </div>
      </div>

      <ResponsiveTable
        columns={columns}
        data={filtered}
        renderCell={renderCell}
        keyExtractor={(item) => item.id}
        emptyMessage={t("common.noResults")}
        mobileCardView
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing
                ? t("page.ticketCategories.edit")
                : t("page.ticketCategories.create")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="ticket-category-name">
              {t("table.name")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ticket-category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("action.cancel")}
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? t("common.loading") : t("action.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <p className="text-muted-foreground text-xs">
        <Link href="/tickets" className="text-primary hover:underline">
          {t("nav.tickets")}
        </Link>
      </p>
    </div>
  );
}
