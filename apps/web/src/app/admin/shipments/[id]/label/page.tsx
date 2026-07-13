import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDict } from "@/i18n/server";
import { PrintButton } from "./print-button";

// Printable shipping label for one per-manufacturer shipment. Biteship has no
// universal label-PDF endpoint, so we render our own from the shipment data and
// let the browser print it (window.print).
export default async function LabelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = (await getDict()).label;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase
    .from("accounts")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") redirect("/admin");

  const { data: ship } = await supabase
    .from("order_shipments")
    .select(
      "id, order_id, manufacturer_id, courier, service, fee, tracking_number, return_tracking_number",
    )
    .eq("id", id)
    .single();
  if (!ship) notFound();

  const { data: order } = await supabase
    .from("orders")
    .select("warung_id, total")
    .eq("id", ship.order_id)
    .single();
  const { data: buyer } = await supabase
    .from("accounts")
    .select("full_name, phone, address")
    .eq("id", order?.warung_id ?? "")
    .single();
  const { data: mfr } = await supabase
    .from("manufacturers")
    .select("company_name, origin_address")
    .eq("account_id", ship.manufacturer_id)
    .single();
  const { data: mfrAcct } = await supabase
    .from("accounts")
    .select("phone, address")
    .eq("id", ship.manufacturer_id)
    .single();
  const fromAddress = mfr?.origin_address || mfrAcct?.address || null;

  const { data: items } = await supabase
    .from("order_items")
    .select("qty, product_variants(weight, products(name, brand, manufacturer_id))")
    .eq("order_id", ship.order_id);
  type ItemRow = {
    qty: number;
    product_variants: {
      weight: number | null;
      products: { name: string; brand: string; manufacturer_id: string } | null;
    } | null;
  };
  const lines = ((items ?? []) as unknown as ItemRow[]).filter(
    (it) => it.product_variants?.products?.manufacturer_id === ship.manufacturer_id,
  );
  const totalWeight = lines.reduce(
    (s, it) => s + (it.product_variants?.weight ?? 1000) * it.qty,
    0,
  );

  return (
    <main className="mx-auto max-w-lg px-6 py-10 print:px-0 print:py-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href="/admin" className="text-sm text-signal hover:underline">
          {t.back}
        </Link>
        <PrintButton label={t.print} />
      </div>

      <div className="rounded-lg border-2 border-ink bg-white p-6 print:rounded-none print:border">
        <div className="flex items-start justify-between border-b border-border pb-3">
          <div>
            <p className="text-lg font-semibold tracking-tight">HALINEST</p>
            <p className="text-xs text-margin">{t.title}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium uppercase">
              {ship.courier} · {ship.service}
            </p>
            <p className="font-mono text-xs text-margin">
              {t.order} #{ship.order_id.slice(0, 8)}
            </p>
          </div>
        </div>

        <div className="mt-3 rounded-md bg-parchment p-3 text-center print:bg-transparent">
          <p className="text-xs uppercase tracking-wide text-margin">{t.resiWaybill}</p>
          <p className="font-mono text-xl font-semibold text-ink">
            {ship.tracking_number ?? t.notBooked}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-margin">
              {t.from}
            </p>
            <p className="mt-1 font-medium">{mfr?.company_name ?? "Manufacturer"}</p>
            {mfrAcct?.phone && <p className="text-xs text-margin">{mfrAcct.phone}</p>}
            {fromAddress && <p className="text-xs text-margin">{fromAddress}</p>}
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-margin">
              {t.to}
            </p>
            <p className="mt-1 font-medium">{buyer?.full_name ?? "Buyer"}</p>
            {buyer?.phone && <p className="text-xs text-margin">{buyer.phone}</p>}
            {buyer?.address && <p className="text-xs text-margin">{buyer.address}</p>}
          </div>
        </div>

        <div className="mt-4 border-t border-border pt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-margin">
            {t.contents}
          </p>
          <ul className="mt-1 space-y-0.5 text-sm">
            {lines.map((it, i) => (
              <li key={i} className="flex justify-between">
                <span>
                  {`${it.product_variants?.products?.brand ?? ""} ${
                    it.product_variants?.products?.name ?? "Item"
                  }`.trim()}
                </span>
                <span className="tabular-nums text-margin">×{it.qty}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-margin">
            {t.totalWeight}{" "}
            <span className="font-medium text-ink">
              {(totalWeight / 1000).toLocaleString("id-ID")} kg
            </span>
          </p>
        </div>

        {ship.return_tracking_number && (
          <div className="mt-4 border-t border-border pt-3 text-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-margin">
              {t.returnResi}
            </p>
            <p className="font-mono text-ink">{ship.return_tracking_number}</p>
          </div>
        )}
      </div>
    </main>
  );
}
