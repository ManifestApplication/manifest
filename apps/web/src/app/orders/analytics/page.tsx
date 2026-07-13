import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDict } from "@/i18n/server";
import { SignOutButton } from "@/components/sign-out-button";
import { PurchaseAnalytics } from "./purchase-analytics";

export default async function OrdersAnalyticsPage() {
  const t = (await getDict()).analytics;
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
  if (me?.role !== "warung") {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-2xl font-medium tracking-tight">{t.purchaseTitle}</h1>
        <p className="mt-2 text-sm text-margin">{t.forWarung}</p>
      </main>
    );
  }

  // sales_lines is RLS-scoped (security_invoker): a warung sees only its own
  // paid order lines.
  const { data: rows } = await supabase
    .from("sales_lines")
    .select("product_name, brand, qty, created_at")
    .order("created_at");

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/orders" className="text-sm text-signal hover:underline">
            {t.backMyOrders}
          </Link>
          <h1 className="mt-2 text-2xl font-medium tracking-tight">
            {t.purchaseTitle}
          </h1>
          <p className="mt-1 text-sm text-margin">{t.purchaseLead}</p>
        </div>
        <SignOutButton />
      </div>

      <PurchaseAnalytics rows={rows ?? []} />
    </main>
  );
}
