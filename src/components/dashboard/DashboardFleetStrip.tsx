"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface DashboardFleetStripProps {
  assets: number;
  accessories: number;
  users: number;
}

const cells = [
  { key: "assets", label: "Assets", href: "/assets" },
  { key: "accessories", label: "Accessories", href: "/accessories" },
  { key: "users", label: "Users", href: "/user" },
] as const;

export default function DashboardFleetStrip({
  assets,
  accessories,
  users,
}: DashboardFleetStripProps) {
  const values = { assets, accessories, users };

  return (
    <div
      className="border-border bg-card divide-border grid grid-cols-3 divide-x overflow-hidden rounded-lg border"
      role="group"
      aria-label="Fleet counts"
    >
      {cells.map((cell) => (
        <Link
          key={cell.key}
          href={cell.href}
          className={cn(
            "hover:bg-muted/60 focus-visible:ring-ring px-4 py-4 transition-colors focus-visible:ring-2 focus-visible:outline-none sm:px-5",
          )}
        >
          <p className="text-foreground text-2xl font-semibold tabular-nums tracking-tight">
            {values[cell.key].toLocaleString()}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs font-medium">
            {cell.label}
          </p>
        </Link>
      ))}
    </div>
  );
}
