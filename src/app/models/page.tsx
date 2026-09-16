import Breadcrumb from "@/components/Breadcrumb";
import { I18nText } from "@/components/I18nText";
import ModelsTable from "../../ui/models/ModelsTable";
import { getModel } from "@/lib/data";

export const metadata = {
  title: "Asset Tracker - Models",
  description: "Asset management tool",
};

export default async function Page() {
  const modelsRaw = await getModel();
  const models = modelsRaw.map((item) => ({
    ...item,
  }));
  return (
    <div>
      <Breadcrumb
        options={[
          { label: <I18nText k="breadcrumb.home" />, href: "/" },
          { label: <I18nText k="nav.models" />, href: "/models" },
        ]}
      />
      <ModelsTable items={models} />
    </div>
  );
}
