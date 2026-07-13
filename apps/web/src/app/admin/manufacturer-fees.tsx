"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/i18n/client";

type Manufacturer = {
  account_id: string;
  company_name: string;
  fee_rate: number;
};

export function ManufacturerFees({ rows }: { rows: Manufacturer[] }) {
  const t = useT().fees;
  const router = useRouter();
  const supabase = createClient();
  // Per-manufacturer percent input, keyed by account_id.
  const [percents, setPercents] = useState<Record<string, string>>(
    Object.fromEntries(rows.map((m) => [m.account_id, String(+(m.fee_rate * 100).toFixed(2))])),
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [bulkPercent, setBulkPercent] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  function parsePercent(value: string): number | null {
    const p = Number(value);
    if (!Number.isFinite(p) || p < 0 || p >= 100) return null;
    return Math.round((p / 100) * 10000) / 10000;
  }

  async function save(id: string) {
    setBusyId(id);
    setError(null);
    setSavedId(null);

    const rate = parsePercent(percents[id] ?? "");
    if (rate === null) {
      setError(t.invalid);
      setBusyId(null);
      return;
    }

    // Only an admin's update is allowed past the manufacturers_guard_fee trigger.
    const { error } = await supabase
      .from("manufacturers")
      .update({ fee_rate: rate })
      .eq("account_id", id);

    setBusyId(null);
    if (error) {
      setError(error.message);
      return;
    }
    setSavedId(id);
    router.refresh(); // re-prices every catalog that uses this manufacturer's fee
  }

  async function applyToAll() {
    setBulkBusy(true);
    setError(null);
    setSavedId(null);

    const rate = parsePercent(bulkPercent);
    if (rate === null) {
      setError(t.invalid);
      setBulkBusy(false);
      return;
    }

    // Update EVERY manufacturer. `gte fee_rate 0` matches all rows; RLS limits
    // this to admins and the guard trigger allows admin updates.
    const { error } = await supabase
      .from("manufacturers")
      .update({ fee_rate: rate })
      .gte("fee_rate", 0);

    setBulkBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    // Reflect the applied value in every row's input.
    const p = Number(bulkPercent);
    setPercents(Object.fromEntries(rows.map((m) => [m.account_id, String(p)])));
    router.refresh();
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-white px-4 py-8 text-center text-sm text-margin">
        {t.empty}
      </div>
    );
  }

  return (
    <>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      {/* Bulk: set the same fee for every manufacturer at once */}
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-parchment/40 p-3 text-sm">
        <span className="text-margin">{t.setAll}</span>
        <input
          type="number"
          min={0}
          max={99.99}
          step={0.1}
          value={bulkPercent}
          onChange={(e) => setBulkPercent(e.target.value)}
          placeholder="e.g. 3"
          className="w-20 rounded-md border border-border bg-paper px-2 py-1 text-right outline-none focus:border-signal focus:ring-2 focus:ring-signal/20"
        />
        <span className="text-margin">%</span>
        <button
          onClick={applyToAll}
          disabled={bulkBusy || bulkPercent === ""}
          className="rounded-md bg-signal px-3 py-1.5 font-medium text-white transition hover:bg-signal/90 disabled:opacity-50"
        >
          {bulkBusy ? t.applying : t.applyAll}
        </button>
      </div>

      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-white">
        {rows.map((m) => (
          <li
            key={m.account_id}
            className="flex items-center justify-between gap-4 px-4 py-3"
          >
            <span className="font-medium">{m.company_name}</span>
            <span className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={99.99}
                step={0.1}
                value={percents[m.account_id] ?? ""}
                onChange={(e) =>
                  setPercents((p) => ({ ...p, [m.account_id]: e.target.value }))
                }
                className="w-20 rounded-md border border-border bg-paper px-2 py-1 text-right text-sm outline-none focus:border-signal focus:ring-2 focus:ring-signal/20"
              />
              <span className="text-margin">%</span>
              <button
                onClick={() => save(m.account_id)}
                disabled={busyId === m.account_id}
                className="rounded-md bg-signal px-3 py-1.5 text-sm font-medium text-white transition hover:bg-signal/90 disabled:opacity-50"
              >
                {busyId === m.account_id ? t.saving : t.save}
              </button>
              {savedId === m.account_id && (
                <span className="text-verified">✓</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
