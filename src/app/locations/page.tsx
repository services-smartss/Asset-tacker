import Breadcrumb from "@/components/Breadcrumb";
import { I18nText } from "@/components/I18nText";
import LocationsTable from "../../ui/locations/LocationsTable";
import { getLocation } from "@/lib/data";

export const metadata = {
  title: "Asset Tracker - Locations",
  description: "Asset management tool",
};

export default async function Page() {
  const locations = await getLocation();
  return (
    <div>
      <Breadcrumb
        options={[
          { label: <I18nText k="breadcrumb.home" />, href: "/" },
          { label: <I18nText k="nav.locations" />, href: "/locations" },
        ]}
      />
      <LocationsTable items={locations} />
    </div>
  );
}
