"use client";

import { useCallback, useEffect, useState } from "react";

export type TicketCategoryOption = {
  id: string;
  name: string;
  sortOrder: number;
};

export function useTicketCategories() {
  const [categories, setCategories] = useState<TicketCategoryOption[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/ticket-categories");
      if (!response.ok) throw new Error("Failed to load categories");
      const data = (await response.json()) as TicketCategoryOption[];
      setCategories(data);
    } catch {
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { categories, loading, reload };
}
