import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Breadcrumb from "@/components/Breadcrumb";
import { I18nText } from "@/components/I18nText";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getOrganizationContext } from "@/lib/organization-context";
import { DEFAULT_TICKET_CATEGORY_NAMES } from "@/lib/ticket-ui";
import TicketCategoriesClient from "./ui/TicketCategoriesClient";

export const metadata = {
  title: "Ticket Categories - Asset Tracker",
  description: "Manage ticket categories",
};

async function getCategories() {
  const orgCtx = await getOrganizationContext();
  const orgId = orgCtx?.organization?.id ?? null;

  const count = await prisma.ticket_categories.count({
    where: { organizationId: orgId },
  });
  if (count === 0) {
    await prisma.ticket_categories.createMany({
      data: DEFAULT_TICKET_CATEGORY_NAMES.map((name, index) => ({
        name,
        organizationId: orgId,
        sortOrder: index + 1,
      })),
      skipDuplicates: true,
    });
  }

  return prisma.ticket_categories.findMany({
    where: { organizationId: orgId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");
  if (!session.user.isadmin) redirect("/dashboard");

  const items = await getCategories();

  return (
    <div className="space-y-4">
      <Breadcrumb
        options={[
          { label: <I18nText k="breadcrumb.home" />, href: "/" },
          { label: <I18nText k="breadcrumb.admin" />, href: "/admin" },
          { label: <I18nText k="page.ticketCategories.title" /> },
        ]}
      />
      <TicketCategoriesClient initialItems={items} />
    </div>
  );
}
