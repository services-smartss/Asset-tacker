import { redirect } from "next/navigation";

export const metadata = {
  title: "Tickets - Asset Tracker",
  description: "View and manage your support tickets",
};

export default function TicketsPage() {
  redirect("/tickets");
}
