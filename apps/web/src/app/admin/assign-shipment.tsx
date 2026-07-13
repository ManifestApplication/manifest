"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/i18n/client";

type Order = { id: string; total: number };
type Distributor = { account_id: string; company_name: string };

export function AssignShipment({
  orders,
  distributors,
}: {
  orders: Order[];
  distributors: Distributor[];
}) {
  const t = useT().assign;
  const router = useRouter();
  const supabase = createClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Per-order chosen distributor (defaults to the first).
  const [choice, setChoice] = useState<Record<string, string>>({});

  async function assign(orderId: string) {
    const distributorId = choice[orderId] ?? distributors[0]?.account_id;
    if (!distributorId) {
      setError(t.noDistributor);
      return;
    }
    setBusyId(orderId);
    setError(null);
    // Insert the shipment; triggers fill commission + create the settlement.
    const { error } = await supabase
      .from("shipments")
      .insert({ order_id: orderId, distributor_id: distributorId });
    setBusyId(null);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-white px-4 py-8 text-center text-sm text-margin">
        {t.empty}
      </div>
    );
  }

  return (
    <>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-white">
        {orders.map((o) => (
          <li
            key={o.id}
            className="flex items-center justify-between gap-4 px-4 py-3"
          >
            <div>
              <p className="font-mono text-sm">#{o.id.slice(0, 8)}</p>
              <p className="text-xs text-margin tabular-nums">
                Rp {o.total.toLocaleString("id-ID")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={choice[o.id] ?? distributors[0]?.account_id ?? ""}
                onChange={(e) =>
                  setChoice((c) => ({ ...c, [o.id]: e.target.value }))
                }
                className="rounded-md border border-border bg-paper px-2 py-1.5 text-sm outline-none focus:border-signal"
              >
                {distributors.map((d) => (
                  <option key={d.account_id} value={d.account_id}>
                    {d.company_name}
                  </option>
                ))}
              </select>
              <button
                disabled={busyId === o.id}
                onClick={() => assign(o.id)}
                className="rounded-md bg-signal px-3 py-1.5 text-sm font-medium text-white transition hover:bg-signal/90 disabled:opacity-50"
              >
                {busyId === o.id ? t.assigning : t.assign}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
