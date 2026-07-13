"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/client";

type Shipment = {
  id: string;
  order_id: string;
  manufacturer_name: string;
  courier: string;
  service: string;
  fee: number;
  status: string | null;
  tracking_number: string | null;
  return_tracking_number: string | null;
};

export function CourierBooking({ shipments }: { shipments: Shipment[] }) {
  const t = useT().courier;
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function post(url: string, body: object, id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) {
        setError(`#${id.slice(0, 8)}: ${data.error}`);
        return;
      }
      router.refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusyId(null);
    }
  }

  function book(id: string) {
    void post("/api/shipping/book", { shipmentId: id }, id);
  }
  function cancel(id: string) {
    const reason = window.prompt(t.cancelPrompt, t.cancelDefault);
    if (reason === null) return; // dismissed
    void post(
      "/api/shipping/cancel",
      { shipmentId: id, reasonCode: "others", reason },
      id,
    );
  }
  function ret(id: string) {
    if (!window.confirm(t.returnConfirm)) return;
    void post("/api/shipping/return", { shipmentId: id }, id);
  }

  if (shipments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-white px-4 py-8 text-center text-sm text-margin">
        {t.empty}
      </div>
    );
  }

  const rp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
  const btn =
    "rounded-md px-3 py-1.5 text-sm font-medium transition disabled:opacity-50";

  return (
    <>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-white">
        {shipments.map((s) => {
          const busy = busyId === s.id;
          const delivered = s.status === "delivered";
          return (
            <li
              key={s.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-mono text-sm">#{s.order_id.slice(0, 8)}</p>
                <p className="text-xs text-margin">
                  {s.manufacturer_name} · {s.courier.toUpperCase()} {s.service} ·{" "}
                  {rp(s.fee)}
                </p>
                {s.tracking_number && (
                  <p className="text-xs text-margin">
                    {t.resi}{" "}
                    <span className="font-mono text-ink">{s.tracking_number}</span>
                    {delivered && ` · ${t.delivered}`}
                  </p>
                )}
                {s.return_tracking_number && (
                  <p className="text-xs text-margin">
                    {t.returnLine}{" "}
                    <span className="font-mono text-ink">
                      {s.return_tracking_number}
                    </span>
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {!s.tracking_number ? (
                  <button
                    disabled={busy}
                    onClick={() => book(s.id)}
                    className={`${btn} bg-signal text-white hover:bg-signal/90`}
                  >
                    {busy ? t.booking : t.book}
                  </button>
                ) : (
                  <>
                    <Link
                      href={`/admin/shipments/${s.id}/label`}
                      className={`${btn} border border-border text-ink hover:bg-parchment`}
                    >
                      {t.label}
                    </Link>
                    {delivered ? (
                      !s.return_tracking_number && (
                        <button
                          disabled={busy}
                          onClick={() => ret(s.id)}
                          className={`${btn} border border-border text-ink hover:bg-parchment`}
                        >
                          {busy ? "…" : t.ret}
                        </button>
                      )
                    ) : (
                      <button
                        disabled={busy}
                        onClick={() => cancel(s.id)}
                        className={`${btn} border border-red-200 text-red-600 hover:bg-red-50`}
                      >
                        {busy ? "…" : t.cancel}
                      </button>
                    )}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
