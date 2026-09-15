import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Breadcrumb from "@/components/Breadcrumb";
import TicketsPageClient from "./ui/TicketsPageClient";
import prisma from "@/lib/prisma";
import { getOrganizationContext } from "@/lib/organization-context";
import { mapTicket, ticketInclude } from "@/lib/ticket-query";

export const metadata = {
  title: "Tickets - Asset Tracker",
  description: "Open and manage support tickets",
};

async function getInboxTickets(userId: string, isAdmin: boolean) {
  const orgContext = await getOrganizationContext();
  const orgId = orgContext?.organization?.id;
  const where = isAdmin
    ? orgId
      ? { user_tickets_createdByTouser: { organizationId: orgId } }
      : {}
    : { createdBy: userId };

  const rawTickets = await prisma.tickets.findMany({
    where,
    include: ticketInclude,
    orderBy: { createdAt: "desc" },
  });

  return rawTickets.map((ticket) => mapTicket(ticket));
}

async function getAdminUsers() {
  return prisma.user.findMany({
    where: { isadmin: true },
    select: {
      userid: true,
      username: true,
      firstname: true,
      lastname: true,
    },
    orderBy: { firstname: "asc" },
  });
}

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/login");
  }

  const isAdmin = session.user.isadmin || false;
  const userId = session.user.id!;
  const [tickets, adminUsers] = await Promise.all([
    getInboxTickets(userId, isAdmin),
    isAdmin ? getAdminUsers() : Promise.resolve([]),
  ]);

  return (
    <>
      <Breadcrumb
        options={[
          { label: "Home", href: "/" },
          { label: "Tickets", href: "/tickets" },
        ]}
      />
      <TicketsPageClient
        tickets={tickets}
        isAdmin={isAdmin}
        currentUserId={userId}
        adminUsers={adminUsers}
      />
    </>
  );
}
