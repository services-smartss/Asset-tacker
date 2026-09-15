import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Breadcrumb from "@/components/Breadcrumb";
import KanbanBoard from "./ui/KanbanBoard";
import prisma from "@/lib/prisma";
import { mapTicket, ticketInclude } from "@/lib/ticket-query";

export const metadata = {
  title: "Tickets - Asset Tracker",
  description: "Manage user tickets and requests",
};

async function getTickets() {
  const rawTickets = await prisma.tickets.findMany({
    include: ticketInclude,
    orderBy: {
      createdAt: "desc",
    },
  });

  return rawTickets.map((ticket) => mapTicket(ticket));
}

async function getAdminUsers() {
  return await prisma.user.findMany({
    where: {
      isadmin: true,
    },
    select: {
      userid: true,
      username: true,
      firstname: true,
      lastname: true,
    },
    orderBy: {
      firstname: "asc",
    },
  });
}

export default async function TicketsPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.isadmin) {
    redirect("/dashboard");
  }

  const [tickets, adminUsers, orgUsers, departments] = await Promise.all([
    getTickets(),
    getAdminUsers(),
    prisma.user.findMany({
      select: {
        userid: true,
        username: true,
        firstname: true,
        lastname: true,
      },
      orderBy: { firstname: "asc" },
    }),
    prisma.department.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumb
        options={[
          { label: "Home", href: "/" },
          { label: "Admin", href: "/admin" },
          { label: "Tickets" },
        ]}
      />
      <div className="mt-6">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">Board</h1>
        <KanbanBoard
          tickets={tickets}
          adminUsers={adminUsers}
          orgUsers={orgUsers}
          departments={departments}
          currentUserId={session.user.id!}
        />
      </div>
    </div>
  );
}
