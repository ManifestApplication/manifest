"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "@/i18n/client";
import { locales, LOCALE_COOKIE, type Locale } from "@/i18n/config";

const LABELS: Record<Locale, string> = { en: "EN", id: "ID" };

// Sets the `lang` cookie client-side and refreshes so the server re-renders in
// the new locale. No API route needed — the cookie rides the next request.
export function LanguageSwitcher() {
  const router = useRouter();
  const locale = useLocale();

  function choose(l: Locale) {
    if (l === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <div className="flex items-center gap-0.5 rounded-md border border-border bg-white p-0.5">
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => choose(l)}
          aria-pressed={l === locale}
          className={
            l === locale
              ? "rounded bg-signal px-2 py-0.5 text-xs font-medium text-white"
              : "rounded px-2 py-0.5 text-xs text-margin transition hover:bg-parchment"
          }
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  );
}
