"use client";

import { useCallback, useMemo } from "react";
import { t as translate, getLocale, type LocaleCode } from "@/lib/i18n";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";

/**
 * Reactive i18n helper. Reads preferences.locale so components re-render
 * when the user switches language. The global setLocale is kept in sync
 * by UserPreferencesProvider.
 */
export function useI18n() {
  const { preferences } = useUserPreferences();
  const locale = preferences.locale || "en";

  const t = useCallback(
    (key: string, params?: Record<string, string>) => {
      void locale;
      return translate(key, params);
    },
    [locale],
  );

  return useMemo(
    () => ({
      t,
      locale: locale as LocaleCode | string,
      getLocale,
    }),
    [t, locale],
  );
}
