import Breadcrumb from "@/components/Breadcrumb";
import { I18nText } from "@/components/I18nText";
import SuppliersTable from "../../ui/suppliers/SuppliersTable";
import { getSuppliers } from "@/lib/data";

export const metadata = {
  title: "Asset Tracker - Suppliers",
  description: "Asset management tool",
};

export default async function Page() {
  const suppliersRaw = await getSuppliers();
  const suppliers = suppliersRaw.map((item) => ({
    ...item,
    creation_date: item.creation_date
      ? typeof item.creation_date === "string"
        ? item.creation_date
        : item.creation_date.toISOString()
      : null,
    change_date: item.change_date
      ? typeof item.change_date === "string"
        ? item.change_date
        : item.change_date.toISOString()
      : null,
  }));

  return (
    <div>
      <Breadcrumb
        options={[
          { label: <I18nText k="breadcrumb.home" />, href: "/" },
          { label: <I18nText k="nav.suppliers" />, href: "/suppliers" },
        ]}
      />
      <SuppliersTable items={suppliers} />
    </div>
  );
}
