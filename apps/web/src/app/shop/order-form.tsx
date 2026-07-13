"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ShippingOptions, type ShippingChoice } from "./shipping-options";
import { useT } from "@/i18n/client";

type Item = {
  variant_id: string;
  product_name: string;
  brand: string;
  variant_name: string;
  net_price: number;
  sell_price: number;
  weight: number;
  manufacturer_id: string;
};

export function OrderForm({
  items,
  destination,
}: {
  items: Item[];
  destination: { latitude: number; longitude: number } | null;
}) {
  const t = useT().orderForm;
  const router = useRouter();
  const supabase = createClient();
  const [qty, setQty] = useState<Record<string, number>>({});
  // Chosen courier per manufacturer_id.
  const [shipping, setShipping] = useState<Record<string, ShippingChoice>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lines the user actually wants (qty > 0).
  const lines = items.filter((it) => (qty[it.variant_id] ?? 0) > 0);
  // Display-only estimate; the DB triggers compute the authoritative total.
  const estimate = lines.reduce(
    (sum, it) => sum + it.sell_price * qty[it.variant_id],
    0,
  );
  // Cart lines for the per-manufacturer rate lookup.
  const shipLines = lines.map((it) => ({
    variant_id: it.variant_id,
    qty: qty[it.variant_id],
  }));
  const shippingTotal = Object.values(shipping).reduce(
    (s, c) => s + c.price,
    0,
  );

  async function placeOrder() {
    setBusy(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError(t.notSignedIn);
      setBusy(false);
      return;
    }

    // Shipping chosen per manufacturer. Total goes on the order (for payment +
    // settlement); if there's a single manufacturer we also set the legacy
    // single-courier columns so admin's Courier booking keeps working.
    const shipEntries = Object.entries(shipping);
    const single = shipEntries.length === 1 ? shipEntries[0][1] : null;

    // 1) Create the order. subtotal/fee/total start at 0; triggers fill them.
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        warung_id: user.id,
        shipping_fee: shippingTotal,
        ...(single && {
          shipping_courier: single.courier,
          shipping_service: single.service,
        }),
      })
      .select("id")
      .single();
    if (orderErr || !order) {
      setError(orderErr?.message ?? t.couldNotCreate);
      setBusy(false);
      return;
    }

    // 2) Add lines — only RAW inputs. The triggers compute line_subtotal,
    //    line_fee, and roll up the order total. We never send a total.
    const { error: itemsErr } = await supabase.from("order_items").insert(
      lines.map((it) => ({
        order_id: order.id,
        variant_id: it.variant_id,
        qty: qty[it.variant_id],
        unit_net_price: it.net_price,
      })),
    );
    if (itemsErr) {
      setError(itemsErr.message);
      setBusy(false);
      return;
    }

    // 2b) One shipment row per manufacturer (multi-origin).
    if (shipEntries.length > 0) {
      await supabase.from("order_shipments").insert(
        shipEntries.map(([manufacturer_id, c]) => ({
          order_id: order.id,
          manufacturer_id,
          courier: c.courier,
          service: c.service,
          fee: c.price,
        })),
      );
    }

    // 3) Create the PENDING payment. Re-read the order's total (the triggers
    //    just computed it) so the amount is the server's number, not ours.
    const { data: placed } = await supabase
      .from("orders")
      .select("total, shipping_fee")
      .eq("id", order.id)
      .single();
    // Buyer pays goods total + the chosen shipping fee. The payment_split
    // trigger settles net → manufacturer, fee → HALINEST, shipping → courier.
    const amount = (placed?.total ?? 0) + (placed?.shipping_fee ?? 0);
    await supabase
      .from("payments")
      .insert({ order_id: order.id, amount, status: "pending" });

    router.push("/orders");
    router.refresh();
  }

  return (
    <div className="mt-6">
      <div className="overflow-hidden rounded-lg border border-border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-parchment/50 text-left text-xs uppercase tracking-wide text-margin">
            <tr>
              <th className="px-4 py-2.5 font-medium">{t.product}</th>
              <th className="px-4 py-2.5 text-right font-medium">{t.price}</th>
              <th className="px-4 py-2.5 text-right font-medium">{t.qty}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((it) => (
              <tr key={it.variant_id}>
                <td className="px-4 py-3">
                  <span className="font-medium">
                    {it.brand} {it.product_name}
                  </span>
                  <span className="block text-xs text-margin">
                    {it.variant_name}
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  Rp {it.sell_price.toLocaleString("id-ID")}
                </td>
                <td className="px-4 py-3 text-right">
                  <input
                    type="number"
                    min={0}
                    value={qty[it.variant_id] ?? 0}
                    onChange={(e) =>
                      setQty({
                        ...qty,
                        [it.variant_id]: Math.max(0, Number(e.target.value)),
                      })
                    }
                    className="w-16 rounded-md border border-border bg-paper px-2 py-1 text-right text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Shipping options (Biteship rate aggregator) */}
      <div className="mt-4">
        <p className="text-sm font-medium">{t.shipping}</p>
        <div className="mt-2">
          <ShippingOptions
            destination={destination}
            lines={shipLines}
            value={shipping}
            onChange={setShipping}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-margin">
          <div>
            {t.goods}{" "}
            <span className="font-medium text-ink tabular-nums">
              Rp {estimate.toLocaleString("id-ID")}
            </span>
          </div>
          {shippingTotal > 0 && (
            <div>
              {t.shipping} ({Object.keys(shipping).length}{" "}
              {Object.keys(shipping).length === 1 ? t.courier : t.couriers}){" "}
              <span className="font-medium text-ink tabular-nums">
                Rp {shippingTotal.toLocaleString("id-ID")}
              </span>
            </div>
          )}
          <div className="mt-0.5">
            {t.totalToPay}{" "}
            <span className="font-medium text-ink tabular-nums">
              Rp {(estimate + shippingTotal).toLocaleString("id-ID")}
            </span>{" "}
            <span className="text-xs">{t.serverConfirms}</span>
          </div>
        </div>
        <button
          disabled={busy || lines.length === 0}
          onClick={placeOrder}
          className="rounded-md bg-signal px-4 py-2 text-sm font-medium text-white transition hover:bg-signal/90 disabled:opacity-50"
        >
          {busy ? t.placing : t.placeOrder}
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
