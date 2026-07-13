"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/i18n/client";

type Shipment = {
  id: string;
  order_id: string;
  status: string;
  commission: number;
  created_at: string;
};

// The forward-only lifecycle. Terminal states have no "next".
const NEXT: Record<string, "loaded" | "in_transit" | "delivered" | "reconciled"> =
  {
    planned: "loaded",
    loaded: "in_transit",
    in_transit: "delivered",
    delivered: "reconciled",
  };

function statusBadge(status: string) {
  const base = "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize";
  if (status === "delivered" || status === "reconciled")
    return `${base} bg-verified/10 text-verified`;
  if (status === "cancelled") return `${base} bg-red-50 text-red-600`;
  return `${base} bg-parchment text-margin`;
}

export function ShipmentList({ shipments }: { shipments: Shipment[] }) {
  const d = useT();
  const t = d.shipmentList;
  const ss = (s: string) => d.shipStatus[s as keyof typeof d.shipStatus] ?? s.replace("_", " ");
  const router = useRouter();
  const supabase = createClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function advance(id: string, current: string) {
    const next = NEXT[current];
    if (!next) return;
    setBusyId(id);
    setError(null);
    const { error } = await supabase
      .from("shipments")
      .update({ status: next })
      .eq("id", id);
    setBusyId(null);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  if (shipments.length === 0) {
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
        {shipments.map((s) => {
          const next = NEXT[s.status];
          return (
            <li
              key={s.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div>
                <p className="font-mono text-sm">#{s.order_id.slice(0, 8)}</p>
                <p className="text-xs text-margin">
                  {t.commission} Rp {s.commission.toLocaleString("id-ID")}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className={statusBadge(s.status)}>{ss(s.status)}</span>
                {next ? (
                  <button
                    disabled={busyId === s.id}
                    onClick={() => advance(s.id, s.status)}
                    className="rounded-md bg-signal px-3 py-1.5 text-sm font-medium text-white transition hover:bg-signal/90 disabled:opacity-50"
                  >
                    {busyId === s.id ? "…" : `${t.mark} ${ss(next)}`}
                  </button>
                ) : (
                  <span className="text-xs text-margin">{t.done}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
