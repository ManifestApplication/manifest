import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/i18n/server";
import { dictionaries } from "@/i18n/dictionaries";
import { SignOutButton } from "@/components/sign-out-button";
import { NewProductForm } from "./new-product-form";
import { EditableProduct } from "./editable-product";
import { LocationModalEditor } from "@/components/location-modal-editor";

function statusBadge(status: string) {
    const base = "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize";
    if (status === "paid" || status === "delivered" || status === "closed")
        return `${base} bg-verified/10 text-verified`;
    if (status === "cancelled") return `${base} bg-red-50 text-red-600`;
    return `${base} bg-parchment text-margin`;
}

export default async function CatalogPage() {
    const locale = await getLocale();
    const d = dictionaries[locale];
    const t = d.catalog;
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: me } = await supabase
        .from("accounts")
        .select("role, full_name")
        .eq("id", user.id)
        .single();

    if (me?.role !== "manufacturer") {
        return (
            <main className="mx-auto max-w-2xl px-6 py-12">
                <h1 className="text-2xl font-medium tracking-tight">{t.fallbackTitle}</h1>
                <div className="mt-4 rounded-lg border border-border bg-white p-6 text-sm">
                    <p className="text-margin">
                        {t.notManufacturer} {user.email}.
                    </p>
                    <p className="mt-4">
                        <SignOutButton />
                    </p>
                </div>
            </main>
        );
    }

    const { data: mfr } = await supabase
        .from("manufacturers")
        .select("company_name, fee_rate, origin_latitude, origin_longitude, origin_address")
        .eq("account_id", user.id)
        .single();
    const feeRate = mfr?.fee_rate ?? 0.03;
    const origin =
        mfr?.origin_latitude != null && mfr?.origin_longitude != null
            ? { lat: mfr.origin_latitude, lng: mfr.origin_longitude }
            : null;

    // My products + their variants (RLS scopes to manufacturer_id = me).
    const { data: products } = await supabase
        .from("products")
        .select(
            "id, name, brand, category, is_active, product_variants(id, variant_name, net_price, weight, is_active)",
        )
        .eq("manufacturer_id", user.id)
        .order("name");

    // An order can contain products from several manufacturers, so DON'T show
    // orders.total (the whole-order amount). Show only MY share = the sum of
    // line_subtotal for my products. order_items is RLS-scoped to my products.
    const { data: myLines } = await supabase
        .from("order_items")
        .select("order_id, line_subtotal");
    const myShare = new Map<string, number>();
    for (const l of myLines ?? [])
        myShare.set(l.order_id, (myShare.get(l.order_id) ?? 0) + l.line_subtotal);

    // Orders containing my products (orders_mfr RLS policy).
    const { data: orderRows } = await supabase
        .from("orders")
        .select("id, status, created_at")
        .order("created_at", { ascending: false });
    const orders = (orderRows ?? []).map((o) => ({
        ...o,
        myShare: myShare.get(o.id) ?? 0,
    }));

    return (
        <main className="mx-auto max-w-3xl px-6 py-12">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-medium tracking-tight">
                        {mfr?.company_name ?? t.fallbackTitle}
                    </h1>
                    <p className="mt-1 text-sm text-margin">
                        {t.seller} · {me.full_name} · {t.fee} {(feeRate * 100).toFixed(0)}% {t.feeSetBy}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/catalog/analytics"
                        className="text-sm text-signal hover:underline"
                    >
                        {d.common.analytics}
                    </Link>
                    <SignOutButton />
                </div>
            </div>

            {/* Ship-from location */}
            <section className="mt-8">
                <h2 className="text-sm font-medium uppercase tracking-wide text-margin">
                    {t.shipFrom}
                </h2>
                <div className="mt-3">
                    <LocationModalEditor
                        current={origin}
                        currentAddress={mfr?.origin_address ?? null}
                        target="manufacturer"
                    />
                </div>
            </section>

            {/* Add product */}
            <section className="mt-8">
                <h2 className="text-sm font-medium uppercase tracking-wide text-margin">
                    {t.addProduct}
                </h2>
                <NewProductForm />
            </section>

            {/* Product list */}
            <section className="mt-8">
                <h2 className="text-sm font-medium uppercase tracking-wide text-margin">
                    {t.yourProducts}
                </h2>
                {products && products.length > 0 ? (
                    <div className="mt-3 space-y-3">
                        {products.map((p) => (
                            <EditableProduct key={p.id} product={p} feeRate={feeRate} />
                        ))}
                    </div>
                ) : (
                    <p className="mt-3 text-sm text-margin">{t.noProducts}</p>
                )}
            </section>

            {/* Incoming orders */}
            <section className="mt-8">
                <h2 className="text-sm font-medium uppercase tracking-wide text-margin">
                    {t.incomingOrders}
                </h2>
                <p className="mt-1 text-xs text-margin">{t.shareNote}</p>
                {orders && orders.length > 0 ? (
                    <ul className="mt-3 divide-y divide-border overflow-hidden rounded-lg border border-border bg-white">
                        {orders.map((o) => (
                            <li
                                key={o.id}
                                className="flex items-center justify-between px-4 py-3"
                            >
                                <span className="font-mono text-sm">#{o.id.slice(0, 8)}</span>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-medium tabular-nums">
                                        Rp {o.myShare.toLocaleString("id-ID")}
                                    </span>
                                    <span className={statusBadge(o.status)}>
                                        {d.status[o.status as keyof typeof d.status] ?? o.status}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="mt-3 text-sm text-margin">{t.noOrders}</p>
                )}
            </section>
        </main>
    );
}
