import Breadcrumb from "@/components/Breadcrumb";
import { I18nText } from "@/components/I18nText";
import AdvancedSearchClient from "./ui/AdvancedSearchClient";

export const metadata = {
  title: "Asset Tracker - Advanced Search",
  description: "Search across all entities with advanced filters",
};

export default function AdvancedSearchPage() {
  return (
    <div className="space-y-6 p-6">
      <Breadcrumb
        options={[
          { label: <I18nText k="breadcrumb.home" />, href: "/" },
          { label: <I18nText k="nav.advancedSearch" />, href: "/search" },
        ]}
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            <I18nText k="page.search.title" />
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Build filters to search across assets, accessories, consumables,
            licences, and components.
          </p>
        </div>
      </div>
      <AdvancedSearchClient />
    </div>
  );
}
