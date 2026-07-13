"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";

type Opt = {
  courier: string;
  courierName: string;
  service: string;
  serviceName: string;
  description: string;
  etd: string;
  price: number;
};

type Group = {
  manufacturer_id: string;
  manufacturer_name: string;
  options: Opt[];
  error: string | null;
};

export type ShippingChoice = {
  courier: string;
  service: string;
  label: string;
  price: number;
};

export function ShippingOptions({
  destination,
  lines,
  value,
  onChange,
}: {
  destination: { latitude: number; longitude: number } | null;
  lines: { variant_id: string; qty: number }[];
  // chosen courier per manufacturer_id
  value: Record<string, ShippingChoice>;
  onChange: (v: Record<string, ShippingChoice>) => void;
}) {
  const t = useT().shipping;
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function check() {
    setLoading(true);
    setNote(null);
    setGroups(null);
    onChange({});
    try {
      const res = await fetch("/api/shipping/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination, lines }),
      });
      const data = await res.json();
      if (data.configured === false) {
        setNote(t.notConfigured);
        return;
      }
      if (data.error) {
        setNote(data.error);
        return;
      }
      const g: Group[] = data.groups ?? [];
      setGroups(g);
      if (g.length === 0) setNote(t.nothing);
    } catch (e) {
      setNote(`${t.fetchError} ${String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  function pick(mid: string, o: Opt) {
    onChange({
      ...value,
      [mid]: {
        courier: o.courier,
        service: o.service,
        label: `${o.courierName} ${o.serviceName}`,
        price: o.price,
      },
    });
  }

  const rp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

  if (!destination) {
    return (
      <div className="rounded-md border border-dashed border-border bg-paper p-3 text-xs text-margin">
        {t.needLocation}
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-paper p-3">
      <button
        type="button"
        onClick={check}
        disabled={loading}
        className="rounded-md border border-border bg-white px-3 py-1.5 text-sm text-signal transition hover:bg-parchment disabled:opacity-50"
      >
        {loading ? t.checking : t.check}
      </button>

      {note && <p className="mt-2 text-xs text-margin">{note}</p>}

      {groups?.map((g) => (
        <div key={g.manufacturer_id} className="mt-3">
          <p className="text-xs font-medium text-margin">
            {t.from} {g.manufacturer_name}
          </p>
          {g.error ? (
            <p className="mt-1 text-xs text-red-600">{g.error}</p>
          ) : g.options.length === 0 ? (
            <p className="mt-1 text-xs text-margin">{t.noCouriers}</p>
          ) : (
            <ul className="mt-1.5 space-y-1.5">
              {g.options.map((o) => {
                const sel =
                  value[g.manufacturer_id]?.courier === o.courier &&
                  value[g.manufacturer_id]?.service === o.service;
                return (
                  <li key={`${o.courier}:${o.service}`}>
                    <label
                      className={`flex cursor-pointer items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm transition ${
                        sel
                          ? "border-signal bg-signal/5"
                          : "border-border bg-white hover:bg-parchment"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`shipping-${g.manufacturer_id}`}
                          checked={sel}
                          onChange={() => pick(g.manufacturer_id, o)}
                        />
                        <span>
                          <span className="font-medium">
                            {o.courierName} {o.serviceName}
                          </span>
                          {o.etd && (
                            <span className="block text-xs text-margin">
                              {t.etd} {o.etd}
                            </span>
                          )}
                        </span>
                      </span>
                      <span className="tabular-nums">{rp(o.price)}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
