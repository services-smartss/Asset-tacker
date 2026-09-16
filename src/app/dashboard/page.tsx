import {
  getAssetCount,
  getUserCount,
  getAccessoryCount,
  getAssetStatusDistribution,
  getAccessoryStatusDistribution,
  getStatus,
} from "@/lib/data";
import Breadcrumb from "@/components/Breadcrumb";
import { I18nText } from "@/components/I18nText";
import { DashboardAdminSubtitle } from "@/components/dashboard/DashboardAdminSubtitle";
import AssetStatusChart from "@/components/charts/AssetStatusChart";
import DismissibleHelpTip from "@/components/DismissibleHelpTip";
import DashboardGrid from "@/components/dashboard/DashboardGrid";
import DashboardFleetStrip from "@/components/dashboard/DashboardFleetStrip";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Boxes } from "lucide-react";
import Link from "next/link";

import { getOrganizationContext } from "@/lib/organization-context";
import prisma from "@/lib/prisma";
import { Suspense } from "react";
import AssetMapClient from "@/components/maps/AssetMapClient";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Asset Tracker - Dashboard",
};

export default async function DashboardPage() {
  let ctx: Awaited<ReturnType<typeof getOrganizationContext>> = null;
  try {
    ctx = await getOrganizationContext();
  } catch {
    redirect("/login");
  }
  if (!ctx?.userId) {
    redirect("/login");
  }
  const isAdmin = ctx.isAdmin ?? false;

  if (!isAdmin && ctx?.userId) {
    return (
      <main className="mx-auto w-full max-w-6xl">
        <Breadcrumb
          options={[
            {
              label: <I18nText k="nav.dashboard" />,
              href: "/dashboard",
              current: true,
            },
          ]}
        />
        <h1 className="text-2xl font-semibold tracking-tight">
          <I18nText k="page.dashboard.title" />
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          <I18nText k="page.dashboard.subtitle.user" />
        </p>
        <div className="mt-6">
          <DashboardGrid isAdmin={false} />
        </div>
      </main>
    );
  }

  const [
    userCount,
    assetCount,
    accessoryCount,
    statusDistribution,
    accessoryStatusDistribution,
    statuses,
  ] = await Promise.all([
    getUserCount(),
    getAssetCount(),
    getAccessoryCount(),
    getAssetStatusDistribution(),
    getAccessoryStatusDistribution(),
    getStatus(),
  ]);

  // Map query is separate — gracefully handles missing columns
  let mapLocations: Array<{
    id: string;
    name: string | null;
    latitude: number;
    longitude: number;
    assetCount: number;
  }> = [];
  try {
    const locationsWithCoords = await prisma.location.findMany({
      where: { latitude: { not: null }, longitude: { not: null } },
      select: {
        locationid: true,
        locationname: true,
        latitude: true,
        longitude: true,
        _count: { select: { asset: true } },
        children: {
          select: {
            _count: { select: { asset: true } },
            children: {
              select: { _count: { select: { asset: true } } },
            },
          },
        },
      },
    });
    mapLocations = locationsWithCoords.map((loc) => {
      let total = loc._count.asset;
      for (const child of loc.children) {
        total += child._count.asset;
        for (const grandchild of child.children) {
          total += grandchild._count.asset;
        }
      }
      return {
        id: loc.locationid,
        name: loc.locationname,
        latitude: loc.latitude!,
        longitude: loc.longitude!,
        assetCount: total,
      };
    });
  } catch {
    // latitude/longitude columns may not exist yet
  }

  const statusCounts = new Map<string, number>();

  statusDistribution.forEach((entry) => {
    const key = entry.statustypeid ?? "__unassigned";
    statusCounts.set(key, entry.count);
  });

  const chartData = [];

  statuses.forEach((status) => {
    const count = statusCounts.get(status.statustypeid) ?? 0;
    chartData.push({ name: status.statustypename ?? "Unknown", value: count });
  });

  const unassignedCount = statusCounts.get("__unassigned");
  if (unassignedCount) {
    chartData.push({ name: "Unassigned", value: unassignedCount });
  }

  const accStatusCounts = new Map<string, number>();
  accessoryStatusDistribution.forEach((entry) => {
    const key = entry.statustypeid ?? "__unassigned";
    accStatusCounts.set(key, entry.count);
  });

  const accChartData: Array<{ name: string; value: number }> = [];
  statuses.forEach((status) => {
    const count = accStatusCounts.get(status.statustypeid) ?? 0;
    accChartData.push({
      name: status.statustypename ?? "Unknown",
      value: count,
    });
  });

  const userName = ctx?.userId
    ? (await import("@/lib/prisma")).default.user
        .findUnique({
          where: { userid: ctx.userId },
          select: { firstname: true },
        })
        .then((u) => u?.firstname)
        .catch(() => null)
    : null;
  const firstName = await userName;
  const fleetEmpty = assetCount === 0 && accessoryCount === 0;

  return (
    <main className="mx-auto w-full max-w-6xl">
      <Breadcrumb
        options={[
          { label: <I18nText k="breadcrumb.home" />, href: "/" },
          { label: <I18nText k="nav.dashboard" />, href: "/dashboard" },
        ]}
      />
      <header className="mt-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          <I18nText k="page.dashboard.title" />
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          <DashboardAdminSubtitle firstName={firstName} />
        </p>
      </header>
      <DismissibleHelpTip id="dashboard-welcome">
        Welcome to your dashboard! Here you can see a quick overview of your
        assets, accessories, and users. Use the sidebar to navigate to specific
        sections, or click the stat cards below to jump to detailed views.
      </DismissibleHelpTip>

      <div className="mt-6">
        <DashboardFleetStrip
          assets={assetCount}
          accessories={accessoryCount}
          users={userCount}
        />
      </div>

      {fleetEmpty && (
        <div className="border-border mt-4 rounded-lg border">
          <EmptyState
            compact
            icon={<Boxes className="h-6 w-6" aria-hidden="true" />}
            title="Start the fleet"
            description="Create the first asset so status charts and the map have something to show."
            action={
              <Button asChild size="sm">
                <Link href="/assets/create">Add first asset</Link>
              </Button>
            }
          />
        </div>
      )}

      {!fleetEmpty && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:mt-6 lg:grid-cols-2">
          <AssetStatusChart data={chartData} title="Asset Status" />
          <AssetStatusChart data={accChartData} title="Accessory Status" />
        </div>
      )}
      <div className="mt-4 sm:mt-6">
        <Suspense
          fallback={
            <div className="text-muted-foreground flex h-[180px] items-center justify-center rounded-lg border text-sm">
              Loading map...
            </div>
          }
        >
          <AssetMapClient
            locations={mapLocations}
            totalAssets={assetCount}
            totalLocations={mapLocations.length}
          />
        </Suspense>
      </div>
      <div className="mt-6 sm:mt-8">
        <DashboardGrid
          serverStats={{
            assets: assetCount,
            accessories: accessoryCount,
            users: userCount,
          }}
        />
      </div>
    </main>
  );
}
