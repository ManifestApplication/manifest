"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT, useLocale } from "@/i18n/client";

type Payment = {
  id: string;
  amount: number;
  status: string;
  order_id: string;
  created_at: string;
};

export function ConfirmList({
  payments,
  adminId,
}: {
  payments: Payment[];
  adminId: string;
}) {
  const t = useT().confirmList;
  const dateLocale = useLocale() === "id" ? "id-ID" : "en-US";
  const router = useRouter();
  const supabase = createClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function confirm(paymentId: string) {
    setBusyId(paymentId);
    setError(null);

    // Only an admin's update passes RLS. This flips status to 'confirmed',
    // which fires the payment_split trigger → settlements + order = paid.
    const { error } = await supabase
      .from("payments")
      .update({
        status: "confirmed",
        confirmed_by: adminId,
        confirmed_at: new Date().toISOString(),
        confirmation_note: "Confirmed via admin UI",
      })
      .eq("id", paymentId);

    setBusyId(null);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh(); // re-fetch the list; the confirmed one drops off
  }

  if (payments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-white px-4 py-10 text-center text-sm text-margin">
        {t.empty}
      </div>
    );
  }

  return (
    <>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-white">
        {payments.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between gap-4 px-4 py-3"
          >
            <div>
              <p className="font-mono text-sm">#{p.order_id.slice(0, 8)}</p>
              <p className="text-xs text-margin">
                {new Date(p.created_at).toLocaleDateString(dateLocale, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium tabular-nums">
                Rp {p.amount.toLocaleString("id-ID")}
              </span>
              <button
                disabled={busyId === p.id}
                onClick={() => confirm(p.id)}
                className="rounded-md bg-verified px-3 py-1.5 text-sm font-medium text-white transition hover:bg-verified/90 disabled:opacity-50"
              >
                {busyId === p.id ? t.confirming : t.confirm}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
