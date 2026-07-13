"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/password-input";
import { useT } from "@/i18n/client";

export default function LoginPage() {
    const t = useT();
    const router = useRouter();
    const supabase = createClient();
    // Pre-filled with a seed user so you can just click "Sign in".
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setLoading(false);
        if (error) {
            setError(error.message);
            return;
        }
        // Route to the right home for this account's role.
        const {
            data: { user },
        } = await supabase.auth.getUser();
        const { data: me } = await supabase
            .from("accounts")
            .select("role")
            .eq("id", user!.id)
            .single();
        const home =
            me?.role === "admin"
                ? "/admin"
                : me?.role === "manufacturer"
                    ? "/catalog"
                    : me?.role === "distributor"
                        ? "/logistics"
                        : "/orders";
        router.push(home);
        router.refresh();
    }

    return (
        <main className="mx-auto flex max-w-sm flex-col gap-6 px-6 py-16">
            <div>
                <h1 className="text-2xl font-medium tracking-tight">{t.login.title}</h1>
                <p className="mt-1 text-sm text-margin">{t.login.lead}</p>
            </div>

            <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-4 rounded-lg border border-border bg-white p-6"
            >
                <label className="flex flex-col gap-1.5 text-sm">
                    <span className="text-margin">{t.login.email}</span>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="mail@manifest.com"
                        className="rounded-md border border-border bg-paper px-3 py-2 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
                    />
                </label>

                <label className="flex flex-col gap-1.5 text-sm">
                    <span className="text-margin">{t.login.password}</span>
                    <PasswordInput
                        value={password}
                        onChange={setPassword}
                        placeholder="••••••••"
                    />
                </label>

                <button
                    disabled={loading}
                    type="submit"
                    className="mt-2 rounded-md bg-signal px-4 py-2 text-sm font-medium text-white transition hover:bg-signal/90 disabled:opacity-50"
                >
                    {loading ? t.login.signingIn : t.common.signIn}
                </button>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <Link
                    href="/forgot-password"
                    className="text-sm text-signal hover:underline"
                >
                    {t.login.forgotPassword}
                </Link>
            </form>

            <p className="text-sm text-margin">
                {t.login.newHere}{" "}
                <Link href="/signup" className="text-signal hover:underline">
                    {t.login.createAccount}
                </Link>
            </p>
            <p className="text-xs text-margin">{t.login.devNote}</p>

            <ul className="text-xs text-margin">
                <li>Admin : manifestapp.cs@gmail.com / manifest@Aerith_21</li>
                <li>Shop 1 : antoniusmart@shop.com / AntoniusMart</li>
                <li>Shop 2 : michellemart@shop.com / MichelleMart</li>
                <li>Manufacture 1 : aeroindopack@inc.com / AeroIndoPack</li>
                <li>Manufacture 2 : omegaspices@inc.com / OmegaSpices</li>
                <li>Courier 1 : fantasylogistic@courier.com / FantasyLogistic</li>
                <li>Courier 2 : fastlogistic@courier.com / FastLogistic</li>
            </ul>
        </main>
    );
}
