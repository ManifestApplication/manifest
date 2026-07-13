import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { getLocale } from "@/i18n/server";
import { dictionaries } from "@/i18n/dictionaries";
import { I18nProvider } from "@/i18n/client";
import { LanguageSwitcher } from "@/components/language-switcher";
import { createClient } from "@/lib/supabase/server";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Manifest — HALINEST",
  description: "Every unit, accounted for.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const dict = dictionaries[locale];

  // Show the active account (as the trigger to edit it) only when signed in.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let accountName: string | null = null;
  if (user) {
    const { data: me } = await supabase
      .from("accounts")
      .select("full_name")
      .eq("id", user.id)
      .single();
    accountName = me?.full_name || user.email || null;
  }
  const initial = (accountName ?? "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-paper font-sans text-ink">
        <I18nProvider locale={locale} dict={dict}>
          <header className="border-b border-border bg-paper/80 backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center gap-2 px-6 py-3">
              <Link href="/" className="text-sm font-medium tracking-tight">
                Manifest
              </Link>
              <span
                className="h-1.5 w-1.5 rounded-full bg-signal"
                aria-hidden="true"
              />
              <span className="text-xs text-margin">{dict.nav.tagline}</span>
              <div className="ml-auto flex items-center gap-3">
                {user && (
                  <Link
                    href="/account"
                    title={dict.common.account}
                    className="flex items-center gap-2 rounded-full border border-border bg-white py-1 pl-1 pr-3 transition hover:bg-parchment"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-signal text-xs font-medium text-white">
                      {initial}
                    </span>
                    <span className="max-w-40 truncate text-xs font-medium text-ink">
                      {accountName}
                    </span>
                  </Link>
                )}
                <LanguageSwitcher />
              </div>
            </div>
          </header>
          <div className="flex-1">{children}</div>
        </I18nProvider>
      </body>
    </html>
  );
}
