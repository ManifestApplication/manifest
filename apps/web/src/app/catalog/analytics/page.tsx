import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDict } from "@/i18n/server";
import { SignOutButton } from "@/components/sign-out-button";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-margin">{label}</p>
      <p className="mt-1 text-xl font-medium tabular-nums">{value}</p>
    </div>
  );
}

export default async function CatalogAnalyticsPage() {
  const t = (await getDict()).analytics;
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
  if (me?.role !== "manufacturer") {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-2xl font-medium tracking-tight">{t.title}</h1>
        <p className="mt-2 text-sm text-margin">{t.forManufacturer}</p>
      </main>
    );
  }

  // RLS (security_invoker view) already scopes to this manufacturer's lines.
  const { data: lines } = await supabase
    .from("sales_lines")
    .select("order_id, brand, product_name, qty, line_subtotal, line_fee")
    .eq("manufacturer_id", user.id);

  const rows = lines ?? [];
  // View columns are typed `number | null` by the generator; coalesce them.
  const revenue = rows.reduce((s, r) => s + (r.line_subtotal ?? 0), 0);
  const units = rows.reduce((s, r) => s + (r.qty ?? 0), 0);
  const fee = rows.reduce((s, r) => s + (r.line_fee ?? 0), 0);
  const orders = new Set(rows.map((r) => r.order_id)).size;

  const byProduct = new Map<string, { revenue: number; units: number }>();
  for (const r of rows) {
    const key = `${r.brand} ${r.product_name}`;
    const cur = byProduct.get(key) ?? { revenue: 0, units: 0 };
    cur.revenue += r.line_subtotal ?? 0;
    cur.units += r.qty ?? 0;
    byProduct.set(key, cur);
  }
  const products = [...byProduct.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue);
  const maxRev = Math.max(1, ...products.map((p) => p.revenue));

  const rp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/catalog" className="text-sm text-signal hover:underline">
            {t.backCatalog}
          </Link>
          <h1 className="mt-2 text-2xl font-medium tracking-tight">
            {t.yourSales}
          </h1>
          <p className="mt-1 text-sm text-margin">{t.yourSalesLead}</p>
        </div>
        <SignOutButton />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={t.netRevenue} value={rp(revenue)} />
        <Stat label={t.unitsSold} value={units.toLocaleString("id-ID")} />
        <Stat label={t.paidOrders} value={String(orders)} />
        <Stat label={t.feeToHalinest} value={rp(fee)} />
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-wide text-margin">
          {t.revenueByProduct}
        </h2>
        {products.length > 0 ? (
          <div className="mt-3 space-y-3 rounded-lg border border-border bg-white p-4">
            {products.map((p) => (
              <div key={p.name}>
                <div className="flex items-baseline justify-between text-sm">
                  <span>{p.name}</span>
                  <span className="text-margin tabular-nums">
                    {rp(p.revenue)} · {p.units} {t.pcs}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-parchment">
                  <div
                    className="h-full rounded-full bg-signal"
                    style={{ width: `${(p.revenue / maxRev) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-margin">{t.noSales}</p>
        )}
      </section>
    </main>
  );
}
