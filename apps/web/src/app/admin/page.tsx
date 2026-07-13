import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDict } from "@/i18n/server";
import { SignOutButton } from "@/components/sign-out-button";
import { ConfirmList } from "./confirm-list";
import { AssignShipment } from "./assign-shipment";
import { ManufacturerFees } from "./manufacturer-fees";
import { CourierBooking } from "./courier-booking";

export default async function AdminPage() {
  const t = (await getDict()).admin;
  const c = (await getDict()).common;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Read my own account row (RLS lets you see yourself) to check the role.
  const { data: me } = await supabase
    .from("accounts")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (me?.role !== "admin") {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-2xl font-medium tracking-tight">{t.title}</h1>
        <div className="mt-4 rounded-lg border border-border bg-white p-6 text-sm">
          <p className="text-margin">
            {t.notAdmin} {user.email}.
          </p>
          <p className="mt-4 flex items-center gap-3">
            <Link href="/orders" className="text-signal hover:underline">
              {c.backToOrders}
            </Link>
            <SignOutButton />
          </p>
        </div>
      </main>
    );
  }

  // Pending payments awaiting manual confirmation.
  const { data: payments, error } = await supabase
    .from("payments")
    .select("id, amount, status, order_id, created_at")
    .eq("status", "pending")
    .order("created_at");

  // Paid orders that need INTERNAL distribution: no shipment yet AND no external
  // courier chosen (those go through Courier booking instead).
  const { data: paidOrders } = await supabase
    .from("orders")
    .select("id, total, shipping_courier")
    .eq("status", "paid")
    .order("created_at");
  const { data: shipped } = await supabase.from("shipments").select("order_id");
  const shippedIds = new Set((shipped ?? []).map((s) => s.order_id));
  const unassigned = (paidOrders ?? []).filter(
    (o) => !shippedIds.has(o.id) && !o.shipping_courier,
  );

  const { data: distributors } = await supabase
    .from("distributors")
    .select("account_id, company_name")
    .order("company_name");

  // Manufacturer fees — admin-controlled (the manufacturers_guard_fee trigger
  // blocks anyone but an admin from changing fee_rate).
  const { data: manufacturers } = await supabase
    .from("manufacturers")
    .select("account_id, company_name, fee_rate")
    .order("company_name");

  // Per-manufacturer shipments for active orders → book / cancel / return / label.
  const { data: shipmentRows } = await supabase
    .from("order_shipments")
    .select(
      "id, order_id, courier, service, fee, status, tracking_number, return_tracking_number, orders!inner(status), manufacturers(company_name)",
    )
    .in("orders.status", ["paid", "shipped", "delivered"])
    .order("created_at");
  type ShipRow = {
    id: string;
    order_id: string;
    courier: string;
    service: string;
    fee: number;
    status: string | null;
    tracking_number: string | null;
    return_tracking_number: string | null;
    manufacturers: { company_name: string } | null;
  };
  const courierShipments = ((shipmentRows ?? []) as unknown as ShipRow[]).map(
    (s) => ({
      id: s.id,
      order_id: s.order_id,
      courier: s.courier,
      service: s.service,
      fee: s.fee,
      status: s.status,
      tracking_number: s.tracking_number,
      return_tracking_number: s.return_tracking_number,
      manufacturer_name: s.manufacturers?.company_name ?? "Manufacturer",
    }),
  );

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">{t.title}</h1>
          <p className="mt-1 text-sm text-margin">{me.full_name}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/analytics"
            className="text-sm text-signal hover:underline"
          >
            {c.analytics}
          </Link>
          <SignOutButton />
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-wide text-margin">
          {t.pendingPayments}
        </h2>
        {error && <p className="mt-2 text-sm text-red-600">{error.message}</p>}
        <div className="mt-3">
          <ConfirmList payments={payments ?? []} adminId={user.id} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-wide text-margin">
          {t.assignShipments}
        </h2>
        <p className="mt-1 text-xs text-margin">{t.assignHint}</p>
        <div className="mt-3">
          <AssignShipment
            orders={unassigned}
            distributors={distributors ?? []}
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-wide text-margin">
          {t.courierBooking}
        </h2>
        <p className="mt-1 text-xs text-margin">{t.courierHint}</p>
        <div className="mt-3">
          <CourierBooking shipments={courierShipments} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-wide text-margin">
          {t.manufacturerFees}
        </h2>
        <p className="mt-1 text-xs text-margin">{t.feesHint}</p>
        <div className="mt-3">
          <ManufacturerFees rows={manufacturers ?? []} />
        </div>
      </section>
    </main>
  );
}
