"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/i18n/client";

export function SignOutButton() {
  const t = useT();
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={signOut}
      className="rounded-md border border-border px-3 py-1.5 text-sm text-margin transition hover:bg-parchment"
    >
      {t.common.signOut}
    </button>
  );
}
