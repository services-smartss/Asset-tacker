import Breadcrumb from "@/components/Breadcrumb";
import { I18nText } from "@/components/I18nText";
import ManufacturersTable from "../../ui/manufacturers/ManufacturersTable";
import { getManufacturers } from "@/lib/data";

export const metadata = {
  title: "Asset Tracker - Manufacturers",
  description: "Asset management tool",
};

export default async function Page() {
  const manufacturersRaw = await getManufacturers();
  const manufacturers = manufacturersRaw.map((item) => ({
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
          { label: <I18nText k="nav.manufacturers" />, href: "/manufacturers" },
        ]}
      />
      <ManufacturersTable items={manufacturers} />
    </div>
  );
}
