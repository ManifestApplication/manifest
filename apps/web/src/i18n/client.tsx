"use client";

import { createContext, useContext } from "react";
import type { Locale } from "./config";
import type { Dict } from "./dictionaries";

// The server layout reads the locale + its dictionary and hands them to this
// provider, so client components can translate without re-reading the cookie.
const I18nContext = createContext<{ locale: Locale; d: Dict } | null>(null);

export function I18nProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dict;
  children: React.ReactNode;
}) {
  return (
    <I18nContext.Provider value={{ locale, d: dict }}>
      {children}
    </I18nContext.Provider>
  );
}

function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within <I18nProvider>");
  return ctx;
}

/** The dictionary for the active locale. */
export function useT(): Dict {
  return useI18n().d;
}

/** The active locale code ("en" | "id"). */
export function useLocale(): Locale {
  return useI18n().locale;
}
