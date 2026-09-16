"use client";

import { useI18n } from "@/hooks/useI18n";

export function DashboardAdminSubtitle({
  firstName,
}: {
  firstName?: string | null;
}) {
  const { t } = useI18n();
  const hour = new Date().getHours();
  const greetingKey =
    hour < 12
      ? "greeting.morning"
      : hour < 17
        ? "greeting.afternoon"
        : "greeting.evening";

  return (
    <>
      {t("page.dashboard.subtitle.admin", {
        greeting: t(greetingKey),
        name: firstName ?? "",
      })}
    </>
  );
}
