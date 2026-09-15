import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Breadcrumb from "@/components/Breadcrumb";
import TicketsPageClient from "./ui/TicketsPageClient";
import prisma from "@/lib/prisma";
import { getOrganizationContext } from "@/lib/organization-context";
import { mapTicket, ticketAccessWhere, ticketInclude } from "@/lib/ticket-query";

export const metadata = {
  title: "Tickets - Asset Tracker",
  description: "Open and manage support tickets",
};

async function getInboxTickets(
  userId: string,
  isAdmin: boolean,
  departmentId: string | null,
) {
  const orgContext = await getOrganizationContext();
  const orgId = orgContext?.organization?.id;
  const where = ticketAccessWhere(
    { id: userId, isAdmin, departmentId },
    orgId,
  );

  const rawTickets = await prisma.tickets.findMany({
    where,
    include: ticketInclude,
    orderBy: { createdAt: "desc" },
  });

  return rawTickets.map((ticket) => mapTicket(ticket));
}

async function getOrgDirectory(organizationId?: string) {
  const where = organizationId ? { organizationId } : {};
  const [orgUsers, departments] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        userid: true,
        username: true,
        firstname: true,
        lastname: true,
      },
      orderBy: { firstname: "asc" },
    }),
    prisma.department.findMany({
      where: organizationId ? { organizationId } : {},
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return { orgUsers, departments };
}

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/login");
  }

  const isAdmin = session.user.isadmin || false;
  const userId = session.user.id!;
  const orgContext = await getOrganizationContext();
  const me = await prisma.user.findUnique({
    where: { userid: userId },
    select: { departmentId: true, organizationId: true },
  });
  const [{ orgUsers, departments }, tickets, adminUsers] = await Promise.all([
    getOrgDirectory(me?.organizationId ?? orgContext?.organization?.id),
    getInboxTickets(userId, isAdmin, me?.departmentId ?? null),
    isAdmin
      ? prisma.user.findMany({
          where: { isadmin: true },
          select: {
            userid: true,
            username: true,
            firstname: true,
            lastname: true,
          },
          orderBy: { firstname: "asc" },
        })
      : Promise.resolve([]),
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
        currentDepartmentId={me?.departmentId ?? null}
        adminUsers={adminUsers}
        orgUsers={orgUsers}
        departments={departments}
      />
    </>
  );
}
