import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Breadcrumb from "@/components/Breadcrumb";
import { I18nText } from "@/components/I18nText";
import TCODashboard from "./ui/TCODashboard";

export const metadata = {
  title: "Asset Tracker - TCO Analysis",
  description: "Total Cost of Ownership analysis across asset categories",
};

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) redirect("/login");
  if (!session.user.isadmin) redirect("/dashboard");

  return (
    <>
      <Breadcrumb
        options={[
          { label: <I18nText k="breadcrumb.home" />, href: "/" },
          { label: <I18nText k="nav.tcoAnalysis" />, href: "/tco" },
        ]}
      />
      <TCODashboard />
    </>
  );
}
