import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDict } from "@/i18n/server";
import { SignOutButton } from "@/components/sign-out-button";

const rp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-margin">{label}</p>
      <p className="mt-1 text-xl font-medium tabular-nums">{value}</p>
    </div>
  );
}

type RankItem = { name: string; value: number; label: string; sub: string };

function Ranking({
  items,
  bar,
  empty,
}: {
  items: RankItem[];
  bar: string;
  empty: string;
}) {
  if (items.length === 0)
    return <p className="mt-3 text-sm text-margin">{empty}</p>;
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="mt-3 space-y-3 rounded-lg border border-border bg-white p-4">
      {items.map((i, idx) => (
        <div key={i.name}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate">
              <span className="text-margin tabular-nums">{idx + 1}.</span>{" "}
              {i.name}
            </span>
            <span className="shrink-0 text-margin tabular-nums">
              <span className="font-medium text-ink">{i.label}</span> · {i.sub}
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-parchment">
            <div
              className={`h-full rounded-full ${bar}`}
              style={{ width: `${(i.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function VariantBreakdown({
  products,
  empty,
  unitsTotalLabel,
  unitsLabel,
  topLabel,
}: {
  products: {
    product: string;
    total: number;
    variants: { name: string; units: number }[];
  }[];
  empty: string;
  unitsTotalLabel: string;
  unitsLabel: string;
  topLabel: string;
}) {
  if (products.length === 0)
    return <p className="mt-3 text-sm text-margin">{empty}</p>;
  return (
    <div className="mt-3 space-y-4 rounded-lg border border-border bg-white p-4">
      {products.map((p) => {
        const max = Math.max(1, ...p.variants.map((v) => v.units));
        return (
          <div key={p.product}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">{p.product}</span>
              <span className="text-xs tabular-nums text-margin">
                {p.total.toLocaleString("id-ID")} {unitsTotalLabel}
              </span>
            </div>
            <div className="mt-2 space-y-1.5">
              {p.variants.map((v, idx) => (
                <div key={v.name}>
                  <div className="flex items-baseline justify-between text-xs">
                    <span
                      className={idx === 0 ? "font-medium text-ink" : "text-margin"}
                    >
                      {v.name}
                      {idx === 0 && (
                        <span className="ml-1.5 rounded-full bg-verified/10 px-1.5 py-0.5 text-[10px] font-medium text-verified">
                          {topLabel}
                        </span>
                      )}
                    </span>
                    <span className="tabular-nums text-margin">
                      {v.units.toLocaleString("id-ID")} {unitsLabel}
                    </span>
                  </div>
                  <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-parchment">
                    <div
                      className="h-full rounded-full bg-ink"
                      style={{ width: `${(v.units / max) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GroupSection({
  group,
  title,
  subtitle,
  children,
}: {
  group: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-parchment px-2.5 py-0.5 text-xs font-medium text-margin">
          {group}
        </span>
        <h2 className="text-sm font-medium uppercase tracking-wide text-margin">
          {title}
        </h2>
      </div>
      <p className="mt-1 text-xs text-margin">{subtitle}</p>
      {children}
    </section>
  );
}

export default async function AdminAnalyticsPage() {
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
  if (me?.role !== "admin") {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-2xl font-medium tracking-tight">{t.title}</h1>
        <p className="mt-2 text-sm text-margin">{t.forAdmin}</p>
      </main>
    );
  }

  // Admin sees ALL paid order lines (RLS), plus manufacturers, distributors,
  // and shipments to label the rankings.
  const { data: lines } = await supabase
    .from("sales_lines")
    .select("order_id, manufacturer_id, brand, product_name, variant_name, qty, line_subtotal, line_fee");
  const { data: manufacturers } = await supabase
    .from("manufacturers")
    .select("account_id, company_name");
  const { data: distributors } = await supabase
    .from("distributors")
    .select("account_id, company_name");
  const { data: shipments } = await supabase
    .from("shipments")
    .select("distributor_id, commission");

  const rows = lines ?? [];

  // ---- platform totals ----
  const net = rows.reduce((s, r) => s + (r.line_subtotal ?? 0), 0);
  const fee = rows.reduce((s, r) => s + (r.line_fee ?? 0), 0);
  const gmv = net + fee;
  const units = rows.reduce((s, r) => s + (r.qty ?? 0), 0);
  const orderCount = new Set(rows.map((r) => r.order_id)).size;

  // ---- WARUNG group: most-bought products (by units) ----
  const prod = new Map<
    string,
    { units: number; orders: Set<string>; revenue: number }
  >();
  for (const r of rows) {
    const name = `${r.brand ?? ""} ${r.product_name ?? ""}`.trim() || "—";
    const e = prod.get(name) ?? { units: 0, orders: new Set(), revenue: 0 };
    e.units += r.qty ?? 0;
    e.orders.add(r.order_id ?? "");
    e.revenue += r.line_subtotal ?? 0;
    prod.set(name, e);
  }
  const topProducts: RankItem[] = [...prod.entries()]
    .map(([name, e]) => ({
      name,
      value: e.units,
      label: `${e.units.toLocaleString("id-ID")} ${t.units}`,
      sub: `${e.orders.size} ${e.orders.size === 1 ? t.orderWord : t.ordersWord}`,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // ---- WARUNG group: best-selling variant per product type ----
  const byProductVariant = new Map<
    string,
    { total: number; variants: Map<string, number> }
  >();
  for (const r of rows) {
    const product = `${r.brand ?? ""} ${r.product_name ?? ""}`.trim() || "—";
    const variant = r.variant_name ?? "—";
    const e = byProductVariant.get(product) ?? { total: 0, variants: new Map() };
    e.total += r.qty ?? 0;
    e.variants.set(variant, (e.variants.get(variant) ?? 0) + (r.qty ?? 0));
    byProductVariant.set(product, e);
  }
  const productVariants = [...byProductVariant.entries()]
    .map(([product, e]) => ({
      product,
      total: e.total,
      variants: [...e.variants.entries()]
        .map(([name, u]) => ({ name, units: u }))
        .sort((a, b) => b.units - a.units),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  // ---- MANUFACTURER group: top sellers (by net sales) ----
  const mfrName = new Map((manufacturers ?? []).map((m) => [m.account_id, m.company_name]));
  const mfr = new Map<string, { revenue: number; units: number }>();
  for (const r of rows) {
    if (!r.manufacturer_id) continue;
    const e = mfr.get(r.manufacturer_id) ?? { revenue: 0, units: 0 };
    e.revenue += r.line_subtotal ?? 0;
    e.units += r.qty ?? 0;
    mfr.set(r.manufacturer_id, e);
  }
  const topManufacturers: RankItem[] = [...mfr.entries()]
    .map(([id, e]) => ({
      name: mfrName.get(id) ?? "—",
      value: e.revenue,
      label: rp(e.revenue),
      sub: `${e.units.toLocaleString("id-ID")} ${t.units}`,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // ---- DISTRIBUTOR group: top commission contributors ----
  const distName = new Map((distributors ?? []).map((d) => [d.account_id, d.company_name]));
  const dist = new Map<string, { commission: number; shipments: number }>();
  for (const s of shipments ?? []) {
    const e = dist.get(s.distributor_id) ?? { commission: 0, shipments: 0 };
    e.commission += s.commission ?? 0;
    e.shipments += 1;
    dist.set(s.distributor_id, e);
  }
  const topDistributors: RankItem[] = [...dist.entries()]
    .map(([id, e]) => ({
      name: distName.get(id) ?? "—",
      value: e.commission,
      label: rp(e.commission),
      sub: `${e.shipments} ${e.shipments === 1 ? t.shipmentWord : t.shipmentsWord}`,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/admin" className="text-sm text-signal hover:underline">
            {t.backAdmin}
          </Link>
          <h1 className="mt-2 text-2xl font-medium tracking-tight">
            {t.platformTitle}
          </h1>
          <p className="mt-1 text-sm text-margin">{t.platformLead}</p>
        </div>
        <SignOutButton />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={t.gmv} value={rp(gmv)} />
        <Stat label={t.halinestFee} value={rp(fee)} />
        <Stat label={t.paidOrders} value={String(orderCount)} />
        <Stat label={t.unitsSold} value={units.toLocaleString("id-ID")} />
      </div>

      <GroupSection
        group={t.groupWarung}
        title={t.mostBought}
        subtitle={t.mostBoughtSub}
      >
        <Ranking items={topProducts} bar="bg-ink" empty={t.noData} />
      </GroupSection>

      <GroupSection
        group={t.groupWarung}
        title={t.bestVariant}
        subtitle={t.bestVariantSub}
      >
        <VariantBreakdown
          products={productVariants}
          empty={t.noData}
          unitsTotalLabel={t.unitsTotal}
          unitsLabel={t.units}
          topLabel={t.top}
        />
      </GroupSection>

      <GroupSection
        group={t.groupManufacturer}
        title={t.topManufacturers}
        subtitle={t.topManufacturersSub}
      >
        <Ranking items={topManufacturers} bar="bg-signal" empty={t.noData} />
      </GroupSection>

      <GroupSection
        group={t.groupDistributor}
        title={t.topDistributors}
        subtitle={t.topDistributorsSub}
      >
        <Ranking items={topDistributors} bar="bg-verified" empty={t.noData} />
      </GroupSection>
    </main>
  );
}
