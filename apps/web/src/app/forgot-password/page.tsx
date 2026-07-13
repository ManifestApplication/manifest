"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/i18n/client";

export default function ForgotPasswordPage() {
  const t = useT().forgot;
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // Always show a generic success (don't reveal whether the email exists).
    setSent(true);
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">{t.title}</h1>
        <p className="mt-1 text-sm text-margin">{t.lead}</p>
      </div>

      {sent ? (
        <div className="rounded-lg border border-border bg-white p-6 text-sm text-margin">
          {t.sent}
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-lg border border-border bg-white p-6"
        >
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-margin">{t.email}</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="mail@manifest.com"
              className="rounded-md border border-border bg-paper px-3 py-2 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
            />
          </label>
          <button
            disabled={loading}
            type="submit"
            className="rounded-md bg-signal px-4 py-2 text-sm font-medium text-white transition hover:bg-signal/90 disabled:opacity-50"
          >
            {loading ? t.sending : t.send}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      )}

      <Link href="/login" className="text-sm text-signal hover:underline">
        {t.back}
      </Link>
    </main>
  );
}
