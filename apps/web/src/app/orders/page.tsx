import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/i18n/server";
import { dictionaries } from "@/i18n/dictionaries";
import { SignOutButton } from "@/components/sign-out-button";
import { LocationModalEditor } from "@/components/location-modal-editor";
import { TrackShipment } from "./track-shipment";

function statusBadge(status: string) {
  const base = "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize";
  if (status === "paid" || status === "delivered" || status === "closed")
    return `${base} bg-verified/10 text-verified`;
  if (status === "cancelled") return `${base} bg-red-50 text-red-600`;
  return `${base} bg-parchment text-margin`;
}

export default async function OrdersPage() {
  const locale = await getLocale();
  const d = dictionaries[locale];
  const t = d.orders;
  const dateLocale = locale === "id" ? "id-ID" : "en-US";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS makes this return ONLY this user's orders — no WHERE clause needed.
  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, total, status, created_at")
    .order("created_at", { ascending: false });

  // Per-manufacturer shipments for these orders (RLS-scoped to own orders).
  const { data: shipmentRows } = await supabase
    .from("order_shipments")
    .select("id, order_id, courier, tracking_number");
  const shipmentsByOrder = new Map<
    string,
    { id: string; courier: string; tracking_number: string | null }[]
  >();
  for (const s of shipmentRows ?? []) {
    const arr = shipmentsByOrder.get(s.order_id) ?? [];
    arr.push({ id: s.id, courier: s.courier, tracking_number: s.tracking_number });
    shipmentsByOrder.set(s.order_id, arr);
  }

  // This account's delivery point (where couriers drop orders). Only warung
  // buyers get an editor — sellers/logistics manage location elsewhere.
  const { data: me } = await supabase
    .from("accounts")
    .select("role, latitude, longitude, address")
    .eq("id", user.id)
    .single();
  const deliveryLoc =
    me?.latitude != null && me?.longitude != null
      ? { lat: me.latitude, lng: me.longitude }
      : null;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">{t.title}</h1>
          <p className="mt-1 text-sm text-margin">{d.common.signedInAs} {user.email}</p>
        </div>
        <SignOutButton />
      </div>

      {me?.role === "warung" && (
        <section className="mt-6">
          <LocationModalEditor
            current={deliveryLoc}
            currentAddress={me?.address ?? null}
            target="warung"
          />
        </section>
      )}

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-margin">
          {orders?.length ?? 0}{" "}
          {orders?.length === 1 ? t.count : t.countPlural}
        </p>
        <span className="flex items-center gap-3">
          <Link
            href="/orders/analytics"
            className="text-sm text-signal hover:underline"
          >
            {d.common.analytics}
          </Link>
          <Link
            href="/shop"
            className="rounded-md bg-signal px-3.5 py-1.5 text-sm font-medium text-white transition hover:bg-signal/90"
          >
            {t.newOrder}
          </Link>
        </span>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error.message}</p>}

      {orders && orders.length > 0 ? (
        <ul className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border bg-white">
          {orders.map((o) => (
            <li key={o.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-mono text-sm">#{o.id.slice(0, 8)}</p>
                <p className="text-xs text-margin">
                  {new Date(o.created_at).toLocaleDateString(dateLocale, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                {(shipmentsByOrder.get(o.id) ?? []).map((s) => (
                  <div key={s.id} className="mt-1">
                    <p className="text-xs text-margin">
                      {s.courier.toUpperCase()}
                      {s.tracking_number && (
                        <>
                          {" "}
                          · {t.resi}{" "}
                          <span className="font-mono text-ink">
                            {s.tracking_number}
                          </span>
                        </>
                      )}
                    </p>
                    {s.tracking_number && <TrackShipment shipmentId={s.id} />}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium tabular-nums">
                  Rp {o.total.toLocaleString("id-ID")}
                </span>
                <span className={statusBadge(o.status)}>
                  {d.status[o.status as keyof typeof d.status] ?? o.status}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-border bg-white px-4 py-10 text-center text-sm text-margin">
          {t.empty}{" "}
          <Link href="/shop" className="text-signal hover:underline">
            {t.emptyCta}
          </Link>
          .
        </div>
      )}
    </main>
  );
}
