"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/password-input";
import { useT } from "@/i18n/client";

type Msg = { kind: "ok" | "err"; text: string } | null;

export function AccountForm({ currentEmail }: { currentEmail: string }) {
  const t = useT().account;
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState(currentEmail);
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMsg, setEmailMsg] = useState<Msg>(null);

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<Msg>(null);

  async function updateEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailMsg(null);
    const next = email.trim();
    if (next === currentEmail) {
      setEmailMsg({ kind: "err", text: t.emailUnchanged });
      return;
    }
    setEmailBusy(true);
    const { error } = await supabase.auth.updateUser({ email: next });
    setEmailBusy(false);
    if (error) {
      setEmailMsg({ kind: "err", text: error.message });
      return;
    }
    setEmailMsg({ kind: "ok", text: t.emailUpdated });
    router.refresh();
  }

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (pw.length < 6) {
      setPwMsg({ kind: "err", text: t.passwordTooShort });
      return;
    }
    if (pw !== pw2) {
      setPwMsg({ kind: "err", text: t.passwordMismatch });
      return;
    }
    setPwBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setPwBusy(false);
    if (error) {
      setPwMsg({ kind: "err", text: error.message });
      return;
    }
    setPw("");
    setPw2("");
    setPwMsg({ kind: "ok", text: t.passwordUpdated });
  }

  const inputClass =
    "rounded-md border border-border bg-paper px-3 py-2 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20";
  const msgClass = (m: Msg) =>
    m?.kind === "ok" ? "text-sm text-verified" : "text-sm text-red-600";

  return (
    <div className="mt-6 space-y-6">
      {/* Email */}
      <form
        onSubmit={updateEmail}
        className="flex flex-col gap-3 rounded-lg border border-border bg-white p-6"
      >
        <h2 className="text-sm font-medium uppercase tracking-wide text-margin">
          {t.emailHeading}
        </h2>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-margin">{t.newEmail}</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </label>
        <p className="text-xs text-margin">{t.emailHint}</p>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={emailBusy}
            className="rounded-md bg-signal px-4 py-2 text-sm font-medium text-white transition hover:bg-signal/90 disabled:opacity-50"
          >
            {emailBusy ? t.updating : t.updateEmail}
          </button>
          {emailMsg && <span className={msgClass(emailMsg)}>{emailMsg.text}</span>}
        </div>
      </form>

      {/* Password */}
      <form
        onSubmit={updatePassword}
        className="flex flex-col gap-3 rounded-lg border border-border bg-white p-6"
      >
        <h2 className="text-sm font-medium uppercase tracking-wide text-margin">
          {t.passwordHeading}
        </h2>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-margin">{t.newPassword}</span>
          <PasswordInput value={pw} onChange={setPw} minLength={6} required />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-margin">{t.confirmPassword}</span>
          <PasswordInput value={pw2} onChange={setPw2} minLength={6} required />
        </label>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pwBusy}
            className="rounded-md bg-signal px-4 py-2 text-sm font-medium text-white transition hover:bg-signal/90 disabled:opacity-50"
          >
            {pwBusy ? t.updating : t.updatePassword}
          </button>
          {pwMsg && <span className={msgClass(pwMsg)}>{pwMsg.text}</span>}
        </div>
      </form>
    </div>
  );
}
