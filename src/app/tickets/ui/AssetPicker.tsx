"use client";

import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";
import type { TicketAsset } from "@/types/ticket";

interface AssetPickerProps {
  value: TicketAsset | null;
  onChange: (asset: TicketAsset | null) => void;
  disabled?: boolean;
}

export function AssetPicker({ value, onChange, disabled }: AssetPickerProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [assets, setAssets] = useState<TicketAsset[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: "1",
          pageSize: "20",
        });
        if (query.trim()) params.set("search", query.trim());
        const response = await fetch(`/api/asset?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          setAssets([]);
          return;
        }
        const data = await response.json();
        const rows = Array.isArray(data) ? data : data.data || [];
        setAssets(
          rows.map((asset: TicketAsset) => ({
            assetid: asset.assetid,
            assetname: asset.assetname,
            assettag: asset.assettag,
          })),
        );
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setAssets([]);
        }
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            {value ? (
              <span className="truncate">
                {value.assettag} — {value.assetname}
              </span>
            ) : (
              <span className="text-muted-foreground">{t("ticket.item")}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={t("ticket.searchAsset")}
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>
                {loading ? t("common.loading") : t("common.noResults")}
              </CommandEmpty>
              <CommandGroup>
                {assets.map((asset) => (
                  <CommandItem
                    key={asset.assetid}
                    value={asset.assetid}
                    onSelect={() => {
                      onChange(asset);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value?.assetid === asset.assetid
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    <span className="truncate">
                      {asset.assettag} — {asset.assetname}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onChange(null)}
          aria-label={t("ticket.clearAsset")}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
