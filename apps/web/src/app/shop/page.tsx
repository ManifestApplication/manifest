import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDict } from "@/i18n/server";
import { OrderForm } from "./order-form";

export default async function ShopPage() {
    const t = (await getDict()).shop;
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    // Only warung (buyer) accounts can place orders: orders.warung_id is a FK
    // into warungs, so a non-warung placing an order hits a FK violation.
    const { data: me } = await supabase
        .from("accounts")
        .select("role, latitude, longitude")
        .eq("id", user.id)
        .single();
    if (me?.role !== "warung") {
        return (
            <main className="mx-auto max-w-2xl px-6 py-12">
                <h1 className="text-2xl font-medium tracking-tight">{t.onlyWarungTitle}</h1>
                <p className="mt-2 text-sm text-margin">
                    {t.onlyWarungBody1}{" "}
                    <span className="font-medium">{me?.role ?? t.onlyWarungRoleFallback}</span>.
                </p>
            </main>
        );
    }

    // The catalog view already computed sell_price (net + 3% fee) in the DB.
    // View columns are typed nullable by the generator; normalize to OrderForm's shape.
    const { data, error } = await supabase
        .from("catalog")
        .select(
            "variant_id, product_name, brand, variant_name, net_price, sell_price, weight, manufacturer_id",
        )
        .order("product_name");
    const items = (data ?? [])
        .filter((r) => r.variant_id != null && r.manufacturer_id != null)
        .map((r) => ({
            variant_id: r.variant_id!,
            product_name: r.product_name ?? "",
            brand: r.brand ?? "",
            variant_name: r.variant_name ?? "",
            net_price: r.net_price ?? 0,
            sell_price: r.sell_price ?? 0,
            weight: r.weight ?? 1000,
            manufacturer_id: r.manufacturer_id!,
        }));

    // Fee isn't fixed at 3% anymore — each manufacturer sets their own. Derive the
    // rate(s) actually present from sell_price vs net_price (1 decimal).
    const feePcts = Array.from(
        new Set(
            items
                .filter((i) => i.net_price > 0)
                .map((i) => Math.round((i.sell_price / i.net_price - 1) * 1000) / 10),
        ),
    ).sort((a, b) => a - b);

    const feeLabel =
        feePcts.length === 0
            ? t.feeGeneric
            : feePcts.length === 1
                ? `HALINEST ${feePcts[0]}%`
                : `HALINEST ${feePcts[0]}%–${feePcts[feePcts.length - 1]}%`;

    return (
        <main className="mx-auto max-w-2xl px-6 py-12">
            <Link href="/orders" className="text-sm text-signal hover:underline">
                {t.myOrders}
            </Link>
            <h1 className="mt-2 text-2xl font-medium tracking-tight">{t.title}</h1>
            <p className="mt-1 text-sm text-margin">
                {t.leadPrefix} {feeLabel}. {t.leadSuffix}
            </p>

            {error && <p className="mt-4 text-sm text-red-600">{error.message}</p>}

            <OrderForm
                items={items}
                destination={
                    me.latitude != null && me.longitude != null
                        ? { latitude: me.latitude, longitude: me.longitude }
                        : null
                }
            />
        </main>
    );
}
