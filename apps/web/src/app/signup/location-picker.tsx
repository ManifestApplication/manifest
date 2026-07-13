"use client";

import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { useT } from "@/i18n/client";

export type LatLng = { lat: number; lng: number };

// Default map center (Jakarta) until a point is chosen.
const DEFAULT_CENTER: LatLng = { lat: -6.2, lng: 106.816666 };

const numInput =
  "w-full rounded-md border border-border bg-paper px-3 py-2 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20";

export function LocationPicker({
  value,
  onChange,
  height = "280px",
}: {
  value: LatLng | null;
  onChange: (v: LatLng) => void;
  height?: string;
}) {
  const t = useT().map;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  function useMyLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) =>
      onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
    );
  }

  // No API key → graceful fallback: manual coordinate entry (no map).
  if (!apiKey) {
    return (
      <div className="rounded-md border border-border bg-paper p-3 text-sm">
        <p className="text-xs text-margin">
          {t.disabledPrefix}{" "}
          <span className="font-mono">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</span>{" "}
          {t.disabledSuffix}
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input
            type="number"
            step="any"
            placeholder={t.latitude}
            value={value?.lat ?? ""}
            onChange={(e) =>
              onChange({ lat: Number(e.target.value), lng: value?.lng ?? 0 })
            }
            className={numInput}
          />
          <input
            type="number"
            step="any"
            placeholder={t.longitude}
            value={value?.lng ?? ""}
            onChange={(e) =>
              onChange({ lat: value?.lat ?? 0, lng: Number(e.target.value) })
            }
            className={numInput}
          />
        </div>
        <button
          type="button"
          onClick={useMyLocation}
          className="mt-2 text-xs text-signal hover:underline"
        >
          {t.useMyLocation}
        </button>
      </div>
    );
  }

  return (
    <MapPicker
      apiKey={apiKey}
      value={value}
      onChange={onChange}
      onUseMyLocation={useMyLocation}
      height={height}
    />
  );
}

function MapPicker({
  apiKey,
  value,
  onChange,
  onUseMyLocation,
  height,
}: {
  apiKey: string;
  value: LatLng | null;
  onChange: (v: LatLng) => void;
  onUseMyLocation: () => void;
  height: string;
}) {
  const t = useT().map;
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey,
  });

  if (!isLoaded) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-lg border border-border bg-paper text-sm text-margin"
      >
        {t.loading}
      </div>
    );
  }

  return (
    <div>
      <GoogleMap
        mapContainerStyle={{
          width: "100%",
          height,
          borderRadius: "0.5rem",
        }}
        center={value ?? DEFAULT_CENTER}
        zoom={value ? 16 : 12}
        onClick={(e) => {
          const lat = e.latLng?.lat();
          const lng = e.latLng?.lng();
          if (lat != null && lng != null) onChange({ lat, lng });
        }}
        options={{ streetViewControl: false, mapTypeControl: false }}
      >
        {value && <Marker position={value} />}
      </GoogleMap>
      <div className="mt-2 flex items-center justify-between text-xs text-margin">
        <span className="tabular-nums">
          {value
            ? `${value.lat.toFixed(6)}, ${value.lng.toFixed(6)}`
            : t.tapHint}
        </span>
        <button
          type="button"
          onClick={onUseMyLocation}
          className="text-signal hover:underline"
        >
          {t.useMyLocation}
        </button>
      </div>
    </div>
  );
}
