"use client";

import { useI18n } from "@/hooks/useI18n";

/** Client helper for translating a key inside server-rendered trees. */
export function I18nText({
  k,
  params,
}: {
  k: string;
  params?: Record<string, string>;
}) {
  const { t } = useI18n();
  return <>{t(k, params)}</>;
}
