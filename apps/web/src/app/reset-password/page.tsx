"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/password-input";
import { useT } from "@/i18n/client";

export default function ResetPasswordPage() {
  const t = useT().reset;
  const supabase = createClient();

  // null = still checking the recovery link; true/false = session ready or not.
  const [ready, setReady] = useState<boolean | null>(null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // The reset email link lands here carrying a recovery token. The browser
  // client auto-detects a hash session; for the PKCE (?code=) flow we exchange
  // it explicitly. Either way we end up with a temporary session that lets the
  // user set a new password.
  useEffect(() => {
    let active = true;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active && session) setReady(true);
    });
    (async () => {
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        try {
          await supabase.auth.exchangeCodeForSession(code);
        } catch {
          /* already consumed by auto-detection — fall through to getSession */
        }
      }
      const { data } = await supabase.auth.getSession();
      if (active) setReady((r) => r ?? !!data.session);
    })();
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pw.length < 6) {
      setError(t.tooShort);
      return;
    }
    if (pw !== pw2) {
      setError(t.mismatch);
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">{t.title}</h1>
        <p className="mt-1 text-sm text-margin">{t.lead}</p>
      </div>

      {done ? (
        <div className="rounded-lg border border-border bg-white p-6">
          <p className="text-sm text-verified">{t.success}</p>
          <Link
            href="/login"
            className="mt-3 inline-block text-sm text-signal hover:underline"
          >
            {t.goSignIn}
          </Link>
        </div>
      ) : ready === false ? (
        <div className="rounded-lg border border-border bg-white p-6">
          <p className="text-sm text-red-600">{t.invalidLink}</p>
          <Link
            href="/forgot-password"
            className="mt-3 inline-block text-sm text-signal hover:underline"
          >
            {t.requestNew}
          </Link>
        </div>
      ) : ready === null ? (
        <div className="rounded-lg border border-border bg-white p-6 text-sm text-margin">
          …
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-lg border border-border bg-white p-6"
        >
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-margin">{t.newPassword}</span>
            <PasswordInput value={pw} onChange={setPw} minLength={6} required />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-margin">{t.confirmPassword}</span>
            <PasswordInput value={pw2} onChange={setPw2} minLength={6} required />
          </label>
          <button
            disabled={busy}
            type="submit"
            className="rounded-md bg-signal px-4 py-2 text-sm font-medium text-white transition hover:bg-signal/90 disabled:opacity-50"
          >
            {busy ? t.submitting : t.submit}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      )}

      <Link href="/login" className="text-sm text-signal hover:underline">
        {t.backToLogin}
      </Link>
    </main>
  );
}
