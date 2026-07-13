"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LocationPicker, type LatLng } from "@/app/signup/location-picker";
import { useLocale } from "@/i18n/client";

// Which table/columns to write. Manufacturers store a ship-from "origin"; a
// warung's delivery point lives on its account row.
type Target = "manufacturer" | "warung";

// UI copy per locale — the component is shared, so it reads the active locale.
const COPY = {
  id: {
    shipFrom: "Lokasi kirim",
    delivery: "Lokasi pengiriman",
    notSet: "Belum diatur — memakai lokasi pendaftaran / hub HALINEST.",
    note: "Titik awal diambil dari lokasi saat pendaftaran. Ubah hanya bila lokasi sebenarnya berbeda.",
    change: "Ubah lokasi",
    close: "Tutup",
    address: "Alamat",
    addressPlaceholder: "Jalan, kota, kode pos…",
    pickFirst: "Pilih titik lokasi dulu.",
    noSession: "Sesi tidak ditemukan, silakan login ulang.",
    cancel: "Batal",
    save: "Simpan lokasi",
    saving: "Menyimpan…",
  },
  en: {
    shipFrom: "Ship-from location",
    delivery: "Delivery location",
    notSet: "Not set yet — using your signup location / the HALINEST hub.",
    note: "The starting point comes from your signup location. Only change it if your actual location differs.",
    change: "Change location",
    close: "Close",
    address: "Address",
    addressPlaceholder: "Street, city, postal code…",
    pickFirst: "Pick a location first.",
    noSession: "Session not found, please sign in again.",
    cancel: "Cancel",
    save: "Save location",
    saving: "Saving…",
  },
};

// A compact location summary with a "Change location" button that opens a modal
// containing the map. Keeping the map behind a button (instead of always shown)
// discourages users from nudging their pin on every visit.
export function LocationModalEditor({
  current,
  currentAddress,
  target,
}: {
  current: LatLng | null;
  currentAddress: string | null;
  target: Target;
}) {
  const locale = useLocale();
  const t = COPY[locale];
  const label = target === "manufacturer" ? t.shipFrom : t.delivery;
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [loc, setLoc] = useState<LatLng | null>(current);
  const [address, setAddress] = useState(currentAddress ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openModal() {
    setLoc(current); // start from the saved values; Cancel discards edits
    setAddress(currentAddress ?? "");
    setError(null);
    setOpen(true);
  }

  async function save() {
    if (!loc) {
      setError(t.pickFirst);
      return;
    }
    setBusy(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError(t.noSession);
      setBusy(false);
      return;
    }
    // manufacturers has a self-write RLS policy; accounts does not (only SELECT),
    // so the warung pin goes through the set_my_location SECURITY DEFINER RPC
    // which touches only the coordinate columns.
    const trimmed = address.trim();
    const { error } =
      target === "manufacturer"
        ? await supabase
            .from("manufacturers")
            .update({
              origin_latitude: loc.lat,
              origin_longitude: loc.lng,
              origin_address: trimmed || null,
            })
            .eq("account_id", user.id)
        : await supabase.rpc("set_my_location", {
            p_lat: loc.lat,
            p_lng: loc.lng,
            p_address: trimmed,
          });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          <p className="mt-0.5 font-mono text-xs text-margin">
            {current
              ? `${current.lat.toFixed(6)}, ${current.lng.toFixed(6)}`
              : t.notSet}
          </p>
          {currentAddress && (
            <p className="mt-0.5 truncate text-xs text-margin">{currentAddress}</p>
          )}
          <p className="mt-1 text-xs text-margin">{t.note}</p>
        </div>
        <button
          type="button"
          onClick={openModal}
          className="shrink-0 rounded-md border border-border px-3.5 py-1.5 text-sm font-medium text-ink transition hover:bg-parchment"
        >
          {t.change}
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-lg border border-border bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-medium">{label}</h3>
              <button
                type="button"
                onClick={() => !busy && setOpen(false)}
                aria-label={t.close}
                className="rounded-md px-2 py-1 text-margin transition hover:bg-parchment"
              >
                ✕
              </button>
            </div>

            <div className="mt-3">
              <LocationPicker value={loc} onChange={setLoc} height="380px" />
            </div>

            <label className="mt-3 flex flex-col gap-1.5 text-sm">
              <span className="text-margin">{t.address}</span>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t.addressPlaceholder}
                className="rounded-md border border-border bg-paper px-3 py-2 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
              />
            </label>

            <div className="mt-4 flex items-center justify-end gap-3">
              {error && <span className="mr-auto text-sm text-red-600">{error}</span>}
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-ink transition hover:bg-parchment disabled:opacity-50"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={save}
                disabled={busy}
                className="rounded-md bg-signal px-4 py-2 text-sm font-medium text-white transition hover:bg-signal/90 disabled:opacity-50"
              >
                {busy ? t.saving : t.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
