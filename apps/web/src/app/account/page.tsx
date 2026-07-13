import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDict } from "@/i18n/server";
import { SignOutButton } from "@/components/sign-out-button";
import { AccountForm } from "./account-form";

// Home route for this account's role — where "Back" returns to.
function homeFor(role: string | undefined): string {
  if (role === "admin") return "/admin";
  if (role === "manufacturer") return "/catalog";
  if (role === "distributor") return "/logistics";
  return "/orders";
}

export default async function AccountPage() {
  const t = (await getDict()).account;
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

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <div className="flex items-start justify-between">
        <div>
          <Link
            href={homeFor(me?.role)}
            className="text-sm text-signal hover:underline"
          >
            {t.back}
          </Link>
          <h1 className="mt-2 text-2xl font-medium tracking-tight">{t.title}</h1>
          <p className="mt-1 text-sm text-margin">{t.lead}</p>
        </div>
        <SignOutButton />
      </div>

      <AccountForm currentEmail={user.email ?? ""} />
    </main>
  );
}
