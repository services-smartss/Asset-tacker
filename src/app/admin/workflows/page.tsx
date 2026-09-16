import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Breadcrumb from "@/components/Breadcrumb";
import { I18nText } from "@/components/I18nText";
import WorkflowsPageClient from "./ui/WorkflowsPageClient";

export const metadata = {
  title: "Admin - Automation Rules",
  description: "Manage automation rules and workflows",
};

export default async function WorkflowsPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.isadmin) {
    redirect("/dashboard");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumb
        options={[
          { label: <I18nText k="breadcrumb.home" />, href: "/" },
          { label: <I18nText k="breadcrumb.admin" />, href: "/admin" },
          { label: <I18nText k="nav.workflows" /> },
        ]}
      />
      <div className="mt-6">
        <WorkflowsPageClient />
      </div>
    </div>
  );
}
