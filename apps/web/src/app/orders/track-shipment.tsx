"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";

type Hist = { note: string; status: string; at: string };
type Tracking = {
  status?: string | null;
  waybill?: string | null;
  courier?: string | null;
  driver?: string | null;
  history?: Hist[];
};

export function TrackShipment({ shipmentId }: { shipmentId: string }) {
  const t = useT().track;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Tracking | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (data) return; // already loaded
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/shipping/track?shipmentId=${shipmentId}`);
      const d = await res.json();
      if (d.error) setError(d.error);
      else setData(d);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-1">
      <button onClick={toggle} className="text-xs text-signal hover:underline">
        {open ? t.hide : t.track}
      </button>

      {open && (
        <div className="mt-1.5 rounded-md border border-border bg-paper p-2 text-xs">
          {loading && <p className="text-margin">{t.loading}</p>}
          {error && <p className="text-red-600">{error}</p>}
          {data && (
            <>
              <p className="text-margin">
                {t.status}{" "}
                <span className="font-medium capitalize text-ink">
                  {data.status ?? "—"}
                </span>
                {data.courier && <> · {data.courier}</>}
                {data.driver && <> · {data.driver}</>}
              </p>
              {data.history && data.history.length > 0 ? (
                <ul className="mt-1.5 space-y-1">
                  {data.history.map((h, i) => (
                    <li key={i} className="border-l-2 border-border pl-2">
                      <span className="text-ink">{h.note}</span>
                      {h.at && (
                        <span className="block text-margin">
                          {new Date(h.at).toLocaleString("id-ID")}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-margin">{t.noUpdates}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
