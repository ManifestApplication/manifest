import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDict } from "@/i18n/server";
import { SignOutButton } from "@/components/sign-out-button";
import { ShipmentList } from "./shipment-list";

export default async function LogisticsPage() {
  const t = (await getDict()).logistics;
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

  if (me?.role !== "distributor") {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-2xl font-medium tracking-tight">{t.notForYouTitle}</h1>
        <div className="mt-4 rounded-lg border border-border bg-white p-6 text-sm">
          <p className="text-margin">
            {t.notForYouBody} {user.email}.
          </p>
          <p className="mt-4">
            <SignOutButton />
          </p>
        </div>
      </main>
    );
  }

  // Shipments assigned to me (RLS scopes to distributor_id = me).
  const { data: shipments } = await supabase
    .from("shipments")
    .select("id, order_id, status, commission, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">{t.title}</h1>
          <p className="mt-1 text-sm text-margin">{t.distributor} · {me.full_name}</p>
        </div>
        <SignOutButton />
      </div>

      <div className="mt-6">
        <ShipmentList shipments={shipments ?? []} />
      </div>
    </main>
  );
}
