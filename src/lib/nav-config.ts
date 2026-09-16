import {
  LayoutDashboard,
  Users,
  UsersRound,
  Boxes,
  Puzzle,
  ClipboardList,
  Factory,
  Truck,
  MapPin,
  BadgeCheck,
  Layers,
  FolderOpen,
  FolderCog,
  FolderKey,
  Tags,
  CircleDot,
  Ticket,
  FileJson,
  ClipboardCheck,
  QrCode,
  Upload,
  Wrench,
  Settings,
  Zap,
  Shield,
  ShieldCheck,
  BarChart3,
  FileSearch,
  Cpu,
  Package,
  SearchCheck,
  Filter,
  CalendarDays,
  HelpCircle,
  Copy,
  ShoppingCart,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  /** i18n key resolved with t() at render time */
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  adminOnly?: boolean;
}

export interface NavSection {
  /** i18n key resolved with t() at render time */
  title: string;
  collapsible?: boolean;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    title: "nav.section.overview",
    items: [
      {
        label: "nav.dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        exact: true,
      },
      { label: "nav.users", href: "/user", icon: Users, adminOnly: true },
      { label: "nav.assets", href: "/assets", icon: Boxes },
      { label: "nav.accessories", href: "/accessories", icon: Puzzle },
    ],
  },
  {
    title: "nav.section.inventory",
    items: [
      { label: "nav.consumables", href: "/consumables", icon: ClipboardList },
      { label: "nav.components", href: "/components", icon: Cpu, adminOnly: true },
      { label: "nav.licences", href: "/licences", icon: BadgeCheck },
      {
        label: "nav.manufacturers",
        href: "/manufacturers",
        icon: Factory,
        adminOnly: true,
      },
      {
        label: "nav.suppliers",
        href: "/suppliers",
        icon: Truck,
        adminOnly: true,
      },
      {
        label: "nav.locations",
        href: "/locations",
        icon: MapPin,
        adminOnly: true,
      },
    ],
  },
  {
    title: "nav.section.categories",
    collapsible: true,
    items: [
      {
        label: "nav.assetCategories",
        href: "/assetCategories",
        icon: Layers,
        adminOnly: true,
      },
      {
        label: "nav.accessoryCategories",
        href: "/accessoryCategories",
        icon: FolderOpen,
        adminOnly: true,
      },
      {
        label: "nav.consumableCategories",
        href: "/consumableCategories",
        icon: FolderCog,
        adminOnly: true,
      },
      {
        label: "nav.componentCategories",
        href: "/componentCategories",
        icon: Cpu,
        adminOnly: true,
      },
      {
        label: "nav.licenceCategories",
        href: "/licenceCategories",
        icon: FolderKey,
        adminOnly: true,
      },
      { label: "nav.models", href: "/models", icon: Tags, adminOnly: true },
      {
        label: "nav.statusTypes",
        href: "/statusTypes",
        icon: CircleDot,
        adminOnly: true,
      },
      {
        label: "nav.ticketCategories",
        href: "/admin/ticket-categories",
        icon: Ticket,
        adminOnly: true,
      },
    ],
  },
  {
    title: "nav.section.tools",
    items: [
      { label: "nav.advancedSearch", href: "/search", icon: Filter },
      { label: "nav.tickets", href: "/tickets", icon: Ticket },
      {
        label: "nav.maintenance",
        href: "/maintenance",
        icon: Wrench,
        adminOnly: true,
      },
      { label: "nav.kits", href: "/kits", icon: Package, adminOnly: true },
      { label: "nav.audits", href: "/audits", icon: SearchCheck, adminOnly: true },
      { label: "nav.reservations", href: "/reservations", icon: CalendarDays },
      {
        label: "nav.approvals",
        href: "/approvals",
        icon: ClipboardCheck,
        adminOnly: true,
      },
      {
        label: "nav.procurement",
        href: "/procurement",
        icon: ShoppingCart,
        adminOnly: true,
      },
      { label: "nav.qrScanner", href: "/scanner", icon: QrCode },
      { label: "nav.import", href: "/import", icon: Upload, adminOnly: true },
      {
        label: "nav.duplicates",
        href: "/duplicates",
        icon: Copy,
        adminOnly: true,
      },
      { label: "nav.help", href: "/help", icon: HelpCircle },
    ],
  },
  {
    title: "nav.section.administration",
    collapsible: true,
    items: [
      { label: "nav.reports", href: "/reports", icon: BarChart3, adminOnly: true },
      {
        label: "nav.tcoAnalysis",
        href: "/tco",
        icon: BarChart3,
        adminOnly: true,
      },
      {
        label: "nav.workflows",
        href: "/admin/workflows",
        icon: Zap,
        adminOnly: true,
      },
      { label: "nav.apiDocs", href: "/api-docs", icon: FileJson, adminOnly: true },
      {
        label: "nav.auditLogs",
        href: "/admin/audit-logs",
        icon: FileSearch,
        adminOnly: true,
      },
      { label: "nav.gdpr", href: "/admin/gdpr", icon: Shield, adminOnly: true },
      {
        label: "nav.compliance",
        href: "/admin/compliance",
        icon: ShieldCheck,
        adminOnly: true,
      },
      { label: "nav.team", href: "/admin/team", icon: UsersRound, adminOnly: true },
      {
        label: "nav.adminSettings",
        href: "/admin/settings",
        icon: Settings,
        adminOnly: true,
      },
    ],
  },
];

export const primaryNavItems: NavItem[] = [
  {
    label: "nav.dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  { label: "nav.assets", href: "/assets", icon: Boxes },
  { label: "nav.users", href: "/user", icon: Users },
  { label: "nav.consumables", href: "/consumables", icon: Package },
];

export function isActivePath(pathname: string, href: string, exact = false) {
  if (exact) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function filterSectionsForUser(
  sections: NavSection[],
  isAdmin: boolean,
): NavSection[] {
  if (isAdmin) return sections;
  return sections.reduce<NavSection[]>((acc, section) => {
    if (!section.items.some((item) => item.adminOnly)) {
      acc.push(section);
      return acc;
    }
    const filtered = section.items.filter((item) => !item.adminOnly);
    if (filtered.length > 0) acc.push({ ...section, items: filtered });
    return acc;
  }, []);
}
