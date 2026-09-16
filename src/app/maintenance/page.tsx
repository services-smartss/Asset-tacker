import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import MaintenancePageClient from "./ui/MaintenancePageClient";
import Breadcrumb from "@/components/Breadcrumb";
import { I18nText } from "@/components/I18nText";

export const metadata = {
  title: "Maintenance Schedules - Asset Tracker",
  description: "Manage maintenance schedules",
};

export default async function MaintenancePage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.isadmin) {
    redirect("/dashboard");
  }

  return (
    <>
      <Breadcrumb
        options={[
          { label: <I18nText k="breadcrumb.home" />, href: "/" },
          { label: <I18nText k="nav.maintenance" /> },
        ]}
      />
      <MaintenancePageClient />
    </>
  );
}
