// Cookie-based i18n config. No URL routing — the active locale lives in a
// cookie read on the server (getLocale) and passed to a client context.
export const locales = ["en", "id"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";
export const LOCALE_COOKIE = "lang";

export function isLocale(v: string | undefined | null): v is Locale {
  return v === "en" || v === "id";
}
