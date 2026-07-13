"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";

type Row = {
  product_name: string | null;
  brand: string | null;
  qty: number | null;
  created_at: string | null;
};

type Granularity = "week" | "month" | "year";

const GRANS: Granularity[] = ["week", "month", "year"];

// Bucket a timestamp into a period key for the chosen granularity.
function periodKey(iso: string, g: Granularity): string {
  const d = new Date(iso);
  if (g === "year") return String(d.getFullYear());
  if (g === "month")
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  // ISO week number (weeks start Monday; week 1 contains the year's first Thursday).
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  date.setUTCDate(date.getUTCDate() - dayNum + 3); // shift to the Thursday of this week
  const thursday = date.getTime();
  date.setUTCMonth(0, 1); // Jan 1 of that ISO year
  if (date.getUTCDay() !== 4) {
    date.setUTCMonth(0, 1 + ((4 - date.getUTCDay() + 7) % 7));
  }
  const week = 1 + Math.ceil((thursday - date.getTime()) / 604800000);
  return `${new Date(thursday).getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function PurchaseAnalytics({ rows }: { rows: Row[] }) {
  const t = useT().analytics;
  const TAB: Record<Granularity, string> = {
    week: t.weekly,
    month: t.monthly,
    year: t.yearly,
  };
  const UNIT: Record<Granularity, string> = {
    week: t.unitWeek,
    month: t.unitMonth,
    year: t.unitYear,
  };
  const UNIT_P: Record<Granularity, string> = {
    week: t.unitWeeks,
    month: t.unitMonths,
    year: t.unitYears,
  };
  const [g, setG] = useState<Granularity>("week");

  // product → (period → summed qty)
  const perProduct = new Map<string, Map<string, number>>();
  for (const r of rows) {
    if (!r.created_at) continue;
    const name = `${r.brand ?? ""} ${r.product_name ?? ""}`.trim() || "—";
    const key = periodKey(r.created_at, g);
    const periods = perProduct.get(name) ?? new Map<string, number>();
    periods.set(key, (periods.get(key) ?? 0) + (r.qty ?? 0));
    perProduct.set(name, periods);
  }

  const products = [...perProduct.entries()]
    .map(([name, periods]) => {
      const totals = [...periods.values()];
      const total = totals.reduce((a, b) => a + b, 0);
      const avg = totals.length ? total / totals.length : 0;
      return { name, total, periodCount: totals.length, avg };
    })
    .sort((a, b) => b.avg - a.avg);

  const maxAvg = Math.max(1, ...products.map((p) => p.avg));
  const unit = UNIT[g];

  return (
    <div className="mt-6">
      {/* Granularity toggle */}
      <div className="inline-flex rounded-md border border-border bg-white p-0.5 text-sm">
        {GRANS.map((key) => (
          <button
            key={key}
            onClick={() => setG(key)}
            className={`rounded px-3 py-1 transition ${
              g === key ? "bg-signal text-white" : "text-margin hover:text-ink"
            }`}
          >
            {TAB[key]}
          </button>
        ))}
      </div>

      <h2 className="mt-6 text-sm font-medium uppercase tracking-wide text-margin">
        {t.avgPer} {unit}, {t.byProduct}
      </h2>

      {products.length > 0 ? (
        <div className="mt-3 space-y-3 rounded-lg border border-border bg-white p-4">
          {products.map((p) => (
            <div key={p.name}>
              <div className="flex items-baseline justify-between text-sm">
                <span>{p.name}</span>
                <span className="text-margin tabular-nums">
                  <span className="font-medium text-ink">
                    {p.avg.toFixed(1)}
                  </span>{" "}
                  / {unit} · {p.total} {t.over} {p.periodCount}{" "}
                  {p.periodCount === 1 ? unit : UNIT_P[g]}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-parchment">
                <div
                  className="h-full rounded-full bg-signal"
                  style={{ width: `${(p.avg / maxAvg) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-margin">{t.noPurchases}</p>
      )}
    </div>
  );
}
